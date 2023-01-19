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
function streamAsPromise(stream: parser.Parser): Promise<any[]> {
    return new Promise((resolve, reject) => {
        let data: any[] = [];        
        stream.on("data", (row: any) => data.push(row));
        stream.on("end", () => resolve(data));
        stream.on("error", error => reject(error));
    });
}

// combined data of multiple fields into one address field
function addressCombined(row: any, columns: any[]) {
	const addressStreet = [
		(row[indexOf(columns, 'MACPA_PreferredAddressLine1')] || '').trim(),
		(row[indexOf(columns, 'MACPA_PreferredAddressLine2')] || '').trim(),
		(row[indexOf(columns, 'MACPA_PreferredAddressLine3')] || '').trim(),
		(row[indexOf(columns, 'MACPA_PreferredAddressLine4')] || '').trim(),
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


async function main() {
    const columns = flatten(await streamAsPromise(fs.createReadStream(path.join(__dirname, "../data/vwPersons.csv"))
        .pipe(parse({ delimiter: "^", from_line: 1, to_line: 1 }))));
    
    // persons
    const rows = await streamAsPromise(fs.createReadStream(path.join(__dirname, "../data/vwPersons.csv"))
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
        })));
        
    // ref: https://github.com/prisma/prisma/issues/9196
    const i = pipe(rows, page(10000));

    for (const chunks of i) {
        // Only import alive people (look at micohort-postgresql for usable_person query)
        const filterChunks = (rows: any[]) => {
            return rows.filter(r => {
                return parseInt(r[indexOf(columns, 'Status')]) != 5 && !['111403', '2464'].includes(r[indexOf(columns, 'ID')]);
            })
        }
        await prisma.micpaPerson.createMany({
            data: filterChunks(chunks).map(row => ({
                id: row[indexOf(columns, 'ID')],
                name: row[indexOf(columns, 'FirstLast')] || 'No name',
                email: row[indexOf(columns, 'Email1')] || 'No email',
                company: row[indexOf(columns, 'NameWCompany')] || 'No company',
                address: addressCombined(row, columns) || 'No address',
            })),
            skipDuplicates: true,
        })
        console.log('persons chunk')
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