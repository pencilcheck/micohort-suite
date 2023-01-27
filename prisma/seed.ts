import indexOf from 'lodash/indexOf'
import flatten from 'lodash/flatten'
import compact from 'lodash/compact'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { pipe, page } from 'iter-ops'
import { parse, parser } from 'csv'
const prisma = new PrismaClient()

// Turning stream into a promise that return an array of object parsed by parser
function streamAsPromise(stream: parser.Parser): Promise<string[][]> {
    return new Promise((resolve, reject) => {
        const data: string[][] = [];        
        stream.on("data", (row: string[]) => data.push(row));
        stream.on("end", () => resolve(data));
        stream.on("error", error => reject(error));
    });
}

// combined data of multiple fields into one address field
function addressCombined(row: string[], columns: string[]) {
	const addressStreet = [
		(row[indexOf<string>(columns, 'MACPA_PreferredAddressLine1')] || '').trim(),
		(row[indexOf<string>(columns, 'MACPA_PreferredAddressLine2')] || '').trim(),
		(row[indexOf<string>(columns, 'MACPA_PreferredAddressLine3')] || '').trim(),
		(row[indexOf<string>(columns, 'MACPA_PreferredAddressLine4')] || '').trim(),
	];
	const location = [
		compact(addressStreet).join(' ').trim(),
		(row[indexOf(columns, 'MACPA_PreferredCity')] || '').trim(),
		(row[indexOf(columns, 'MACPA_PreferredState')] || '').trim(),
	];
	const address = [
		compact(location).join(', ').trim(),
		(row[indexOf(columns, 'MACPA_PreferredZip')] || '').trim(),
		(row[indexOf(columns, 'MACPA_PreferredCountry')] || '').trim(),
	];
	const combinedAddress = compact(address).join(' ');
	return combinedAddress || 'No address';
}

function readStreamForColumn(filename: string) {
    return fs.createReadStream(path.join(__dirname, filename))
        .pipe(parse({ delimiter: "^", from_line: 1, to_line: 1 }));
}

function readStreamForData(filename: string) {
    return fs.createReadStream(path.join(__dirname, filename))
        .pipe(parse({
            delimiter: "^",
            from_line: 2,
            cast: (value, { quoting }) => {
                if (!quoting && value.toLowerCase() === 'null') {
                    return null;
                } else {
                    return value;
                } 
            }
        }))
}

async function main() {
    // Persons
    const columns = flatten(
        await streamAsPromise(readStreamForColumn("../data/vwPersons.csv")).catch(() => [])
    );
    const rows = await streamAsPromise(readStreamForData("../data/vwPersons.csv")).catch(() => []);
        
    // ref: https://github.com/prisma/prisma/issues/9196
    const i = pipe(rows, page(10000));
    for (const chunks of i) {
        // Only import alive people (look at micohort-postgresql for usable_person query)
        const filterChunks = (rows: string[][]) => {
            return rows.filter(r => {
                return parseInt(r[indexOf<string>(columns, 'Status')] ?? '-1') != 5
                    && !['111403', '2464'].includes(r[indexOf<string>(columns, 'ID')] ?? '-1');
            })
        }
        const persons = await prisma.micpaPerson.createMany({
            data: filterChunks(chunks).map(row => ({
                id: row[indexOf<string>(columns, 'ID')] as string,
                name: row[indexOf(columns, 'FirstLast')] || 'No name',
                email: row[indexOf(columns, 'Email1')] || 'No email',
                company: row[indexOf(columns, 'NameWCompany')] || 'No company',
                address: addressCombined(row, columns) || 'No address',
            })),
            skipDuplicates: true,
        })
        console.log(`${persons.count} persons imported`)
    }

    // mailing list (for testing purposes)
    interface InputMailingList {
        id: string;
        title: string;
        list: string[];
        last_edited_at: string;
        created_at: string;
    }
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/mailing_list.json")).toString()) as InputMailingList[];

    const mailingLists = await prisma.mailingList.createMany({
        data: data.map(row => ({
            id: row.id,
            title: row.title,
        })),
        skipDuplicates: true,
    });
    console.log(`${mailingLists.count} mailing lists imported`)

    for (const row of data) {
        const listsOnPersons = await prisma.mailingListsOnPersons.createMany({
            data: row.list.map(personId => ({
                // id is defined automatically in schema based on the two fields below
                mailingListId: row.id,
                personId: personId,
            })),
            skipDuplicates: true,
        });
        console.log(`${listsOnPersons.count} lists on persons imported`)
    }
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })