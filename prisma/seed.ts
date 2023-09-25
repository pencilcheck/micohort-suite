import map from 'lodash/map'
import indexOf from 'lodash/indexOf'
import flatten from 'lodash/flatten'
import compact from 'lodash/compact'
import eachMonthOfInterval from 'date-fns/eachMonthOfInterval'
import eachQuarterOfInterval from 'date-fns/eachQuarterOfInterval'
import eachDayOfInterval from 'date-fns/eachDayOfInterval'
import Async from 'bluebird'
import clamp from 'date-fns/clamp'
import { MicpaEducationUnit, MicpaProduct, Prisma, PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { pipe, page } from 'iter-ops'
import { parse, parser } from 'csv'
dayjs.extend(utc)
dayjs.extend(customParseFormat)
const prisma = new PrismaClient()

const UTCOffset = -5

async function deleteAll(tableName: string) {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tableName}" RESTART IDENTITY;`)
}

function trycatch(func: () => string, fail: string): string {
  try { return func() }
  catch(e) { console.log(fail); throw e; }
}

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

async function importProducts() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaProduct`)

  // Products
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwProducts.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwProducts.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    // Only import alive people (look at micohort-postgresql for usable_person query)
    const filterChunks = (rows: string[][]) => {
      return rows.filter(r => {
        return parseInt(r[indexOf<string>(columns, 'RootCategoryID')] ?? '-1') === 37 // cpe
        && !r[indexOf<string>(columns, 'WebName')]?.includes('CANCELLED') // not cancelled
        && !r[indexOf<string>(columns, 'ParentID')]; // parent
      })
    }
    const products = await prisma.micpaProduct.createMany({
      data: filterChunks(chunks).map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        webName: row[indexOf(columns, 'WebName')] || 'No web name',
        name: row[indexOf(columns, 'Name')] || 'No name',
        code: row[indexOf(columns, 'Code')] || 'No code',
        startAt: (row[indexOf(columns, 'MACPA_StartDate')]
          ? dayjs(row[indexOf(columns, 'MACPA_StartDate')]?.replaceAll(/\s+/g, ' '), "MMM D YYYY h:mmA").utcOffset(UTCOffset).toISOString()
          : null),
        subscriptionStartAt: (row[indexOf(columns, 'SubscriptionStartDate')]
          ? dayjs(row[indexOf(columns, 'SubscriptionStartDate')]?.replaceAll(/\s+/g, ' '), "MMM D YYYY h:mmA").utcOffset(UTCOffset).toISOString()
          : null),
        productCategory: row[indexOf(columns, 'ProductCategory')] || 'No product category',
      })),
      skipDuplicates: true,
    })
    console.log(`${products.count} products imported`)
  }
}

async function importPersons() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaPerson`)

  // Persons
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwPersons.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwPersons.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    // Only import alive people (look at micohort-postgresql for usable_person query)
    const filterChunks = (rows: string[][]) => {
      return rows.filter(r => {
        return parseInt(r[indexOf<string>(columns, 'Status')] ?? '-1') != 5
        && !['111403', '2464'].includes(r[indexOf<string>(columns, 'ID')] ?? '-1');
      })
    }

    // createMany is 100x (not tested) faster than update
    const persons = await prisma.micpaPerson.createMany({
      data: filterChunks(chunks).map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        name: row[indexOf(columns, 'FirstLast')] || 'No name',
        email: row[indexOf(columns, 'Email1')] || 'No email',
        company: row[indexOf(columns, 'NameWCompany')] || 'No company',
        memberType: row[indexOf(columns, 'MemberTypeID')] || '',
        address: addressCombined(row, columns) || 'No address',
      })),
      skipDuplicates: true,
    })
    console.log(`${persons.count} persons imported`)
  }
}

async function importExportPersons() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaExportPerson`)

  // Persons
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwPersons.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwPersons.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    // Only import alive people (look at micohort-postgresql for usable_person query)
    const filterChunks = (rows: string[][]) => {
      return rows.filter(r => {
        return parseInt(r[indexOf<string>(columns, 'Status')] ?? '-1') != 5
        && !['111403', '2464'].includes(r[indexOf<string>(columns, 'ID')] ?? '-1');
      })
    }

    // createMany is 100x (not tested) faster than update
    const persons = await prisma.micpaExportPerson.createMany({
      data: filterChunks(chunks).map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        firstName: row[indexOf(columns, 'FirstName')] || 'No name',
        lastName: row[indexOf(columns, 'LastName')] || '',
        email: row[indexOf(columns, 'Email1')] || 'No email',
        prefEmail: true, // TODO will add once data sync has new data
        company: row[indexOf(columns, 'NameWCompany')] || 'No company',
        memberType: row[indexOf(columns, 'MemberTypeID')] || '',
        addressLine1: row[indexOf(columns, 'MACPA_PreferredAddressLine1')] || 'No address',
        addressLine2: row[indexOf(columns, 'MACPA_PreferredAddressLine2')] || 'No address',
        addressLine3: row[indexOf(columns, 'MACPA_PreferredAddressLine3')] || 'No address',
        addressLine4: row[indexOf(columns, 'MACPA_PreferredAddressLine4')] || 'No address',
        city: row[indexOf(columns, 'MACPA_PreferredCity')] || 'No city',
        state: row[indexOf(columns, 'MACPA_PreferredState')] || 'No state',
        zip: row[indexOf(columns, 'MACPA_PreferredZip')] || 'No zip',
        badgeName: '', // TODO also will add once data sync
      })),
      skipDuplicates: true,
    })
    console.log(`${persons.count} export persons imported`)
  }
}

async function importOrders() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaOrder`)

  // Orders
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwOrders.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwOrders.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    const orders = await prisma.micpaOrder.createMany({
      data: chunks.map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        orderDate: (row[indexOf(columns, 'OrderDate')]
          ? dayjs(row[indexOf(columns, 'OrderDate')]?.replaceAll(/\s+/g, ' '), "MMM D YYYY h:mmA").utcOffset(UTCOffset).toISOString()
          : null),
        status: row[indexOf(columns, 'OrderTypeID')]?.trim() !== '3' ? 'Order' : 'Cancellation',
        customerId: row[indexOf(columns, 'BillToID')]!,
      })),
      skipDuplicates: true,
    })
    console.log(`${orders.count} orders imported`)
  }
}

async function importOrderDetails() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaOrderDetail`)

  // OrderDetails
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwOrderDetails.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwOrderDetails.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    const details = await prisma.micpaOrderDetail.createMany({
      data: chunks.map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        productId: row[indexOf<string>(columns, 'ProductID')] as string,
        orderId: row[indexOf<string>(columns, 'OrderID')] as string,
        subscriberId: row[indexOf<string>(columns, 'SubscriberID')] as string,
        spending: parseFloat(row[indexOf(columns, 'Extended')] ?? '0'),
      })),
      skipDuplicates: true,
    })
    console.log(`${details.count} details imported`)
  }
}

async function importPersonCPALicenses() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`PersonLicense`)

  const allPersonIds = (await prisma.micpaPerson.findMany({
    select: {
      id: true,
    }
  })).map(o => o.id)

  // PersonCPALicenses
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwPersonCPALicenses.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwPersonCPALicenses.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    const filterChunks = (rows: string[][]) => {
      return rows.filter(row => {
        return allPersonIds.includes(row[indexOf<string>(columns, 'ID')] as string);
      })
    }

    const personLicenses = await prisma.personLicense.createMany({
      data: filterChunks(chunks).map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        personId: row[indexOf<string>(columns, 'ID')] as string,
        laraStatus: row[indexOf<string>(columns, 'LicenseStatus')]?.trim() || '',
        licenseDate: row[indexOf<string>(columns, 'LicenseDate')]?.trim() || '',
      })),
      skipDuplicates: true,
    })
    console.log(`${personLicenses.count} personLicenses imported`)

    // comment the relation for personlicense before running this
    //const [_, personLicenses] = await prisma.$transaction([
      //prisma.personLicense.deleteMany({
        //where: {
          //id: {
            //in: filterChunks(chunks).map(row => (row[indexOf<string>(columns, 'ID')] as string))
          //}
        //}
      //}),
      //prisma.personLicense.createMany({
        //data: filterChunks(chunks).map(row => ({
          //id: row[indexOf<string>(columns, 'ID')] as string,
          //laraStatus: row[indexOf<string>(columns, 'LicenseStatus')]?.trim() || '',
          //licenseDate: row[indexOf<string>(columns, 'LicenseDate')]?.trim() || '',
        //})),
        //skipDuplicates: true,
      //}),
    //])
    //console.log(`${personLicenses.count} personLicenses imported`)
  }
}

async function importEducationUnits() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaEducationUnit`)

  // EducationUnits
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwEducationUnits.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwEducationUnits.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(100000));
  for (const chunks of i) {
    const filterChunks = (rows: string[][]) => {
      return rows.filter(r => {
        return parseInt(r[indexOf<string>(columns, 'EducationCategoryID')] ?? '-1') != 9 // not certificates
        && parseInt(r[indexOf<string>(columns, 'MACPA_CarryOver')] ?? '-1') != 1; // not carry over
      })
    }
    const educationUnits = await prisma.micpaEducationUnit.createMany({
      data: filterChunks(chunks).map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        isThirdParty: row[indexOf<string>(columns, 'Source')]?.trim() === '3rd Party' && !row[indexOf<string>(columns, 'WebinarVendorID')],
        externalSource: row[indexOf<string>(columns, 'ExternalSource')] as string,
        productId: row[indexOf<string>(columns, 'ProductID')] as string,
        orderId: row[indexOf<string>(columns, 'OrderID')] as string,
        personId: row[indexOf<string>(columns, 'PersonID')] as string,
        educationCategory: row[indexOf(columns, 'EducationCategory')]?.trim() || 'No education category',
        creditEarned: parseFloat(row[indexOf(columns, 'EducationUnits')] ?? '0'),
        creditAt: (row[indexOf(columns, 'MACPA_CreditDate')]
          ? dayjs(row[indexOf(columns, 'MACPA_CreditDate')]?.replaceAll(/\s+/g, ' '), "MMM D YYYY h:mmA").utcOffset(UTCOffset).toISOString()
          : null),
      })),
      skipDuplicates: true,
    })
    console.log(`${educationUnits.count} educationUnits imported`)
  }
}

async function importMailingList() {
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

async function fillInEmptyMicpaEducationUnitExternalSource() {
  let educationUnits = [];
  do {
    educationUnits = await prisma.micpaEducationUnit.findMany({
      select: {
        id: true,
        product: true,
      },
      where: {
        externalSource: {
          equals: '', // empty string
        }
      },
      take: 100000,
    });

    // look like even neon can't do this much, reducing page size
    const i = pipe(educationUnits, page(10));
    for (const chunks of i) {
      await prisma.$transaction(
        chunks.map((unit: { id: string, product: MicpaProduct | null }) => {
          return prisma.micpaEducationUnit.update({
            data: {
              externalSource: unit?.product?.name || 'No name',
            },
            where: {
              id: unit.id,
            }
          })
        })
      )
      console.log(`${chunks.length} chunk of educationUnits updated for relation`)
    }
    //const updateManyResult = await Async.map(
      //educationUnits,
      //async (args: typeof createManyArgs[0], i: number) => {
        //const dateRange = quarterBigram[i]!;
        //const data = args
          //.filter((arg: typeof args[0]) => (arg?._sum?.creditEarned ?? 0) > 0)
          //.map(arg => ({
            //personId: arg.personId!,
            //isThirdParty: arg.isThirdParty,
            //educationCategory: arg.educationCategory!,
            //creditEarned: arg._sum.creditEarned,
            //creditStartAt: dateRange[0],
            //creditEndAt: dateRange[1],
          //}))
        ////console.log('data length', data.length)

        //const chunks = pipe(data, page(5000));
        //for (const chunk of chunks) {
          //await prisma.micpaAggregatedEducationUnit.createMany({ data: chunk });
        //}
        //return data;

        //// planetscale has 20s limit per transaction, need to chunk it, see solution above
        ////return await prisma.micpaAggregatedEducationUnit.createMany({ data })
      //},
      //{
        //concurrency: 17 // limited by planetscale
      //}
    //)
    console.log(`${educationUnits.length} education units externalsource updated`)
  } while (educationUnits.length > 0)
}

async function seedKeywordFilterDropdown() {
  // Reset ONLY if needed (keyword contains user data)
  //await deleteAll(`KeywordFilterDropdown`)

  const hasKeywords = await prisma.keywordFilterDropdown.count();
  if (hasKeywords <= 0) {
    await prisma.keywordFilterDropdown.createMany({
      data: [
        { value: 'audit', label: 'Audit' },
        { value: 'accounting', label: 'Accounting' },
        { value: 'business', label: 'Business' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'government', label: 'Government' },
        { value: 'cpe', label: 'CPE' },
        { value: 'risk', label: 'Risk' },
        { value: 'lease accounting', label: 'Lease Accounting' },
      ],
      skipDuplicates: true,
    });
  }
}

async function fillInMicpaAggregatedEducationUnit() {
  // Reset table (no foreign key so no worries)
  await deleteAll(`MicpaAggregatedEducationUnit`)

  async function createRoutine(dates: Date[]) {
    const quarterBigram = compact(map(dates, (v, i, array) => {
      if ((i+1) === array.length) {
        return null;
      }
      return [v, array[i+1]]; 
    }))

    const createManyArgs = await Async.map(
      quarterBigram,
      async (range: typeof quarterBigram[0]) => {
        return await prisma.micpaEducationUnit.groupBy({
          by: ['personId', 'isThirdParty', 'educationCategory'],
          _sum: {
            creditEarned: true,
          },
          where: {
            creditAt: {
              gt: range[0], // not inclusive, don't want overlaps
              lte: range[1], // inclusive
            }
          },
          orderBy: [
            {
              personId: 'desc',
            },
            {
              isThirdParty: 'desc',
            },
            {
              educationCategory: 'desc',
            }
          ]
        })
      },
      {
        concurrency: 1
      }
    );

    const createManyResult = await Async.map(
      createManyArgs,
      async (args: typeof createManyArgs[0], i: number) => {
        const dateRange = quarterBigram[i]!;
        const data = args
          .filter((arg: typeof args[0]) => (arg?._sum?.creditEarned ?? 0) > 0)
          .map(arg => ({
            personId: arg.personId!,
            isThirdParty: arg.isThirdParty,
            educationCategory: arg.educationCategory!,
            creditEarned: arg._sum.creditEarned,
            creditStartAt: dateRange[0],
            creditEndAt: dateRange[1],
          }))
        //console.log('data length', data.length)

        const chunks = pipe(data, page(1000));
        for (const chunk of chunks) {
          await prisma.micpaAggregatedEducationUnit.createMany({ data: chunk });
        }
        return data;

        // planetscale has 20s limit per transaction, need to chunk it, see solution above
        //return await prisma.micpaAggregatedEducationUnit.createMany({ data })
      },
      {
        concurrency: 1
      }
    )
    return createManyResult;
  }

  const dateRange = await prisma.micpaEducationUnit.aggregate({
    _max: {
      creditAt: true
    },
    _min: {
      creditAt: true
    }
  });

  if (dateRange._min.creditAt && dateRange._max.creditAt) {
    const start = clamp(dateRange._min.creditAt, {
      start: new Date(2017, 0, 1),
      end: new Date(),
    })
    const end = clamp(dateRange._max.creditAt, {
      start: new Date(2017, 0, 1),
      end: new Date(),
    })

    // NOTE: Too complicated, make it simple by just having daily count
    //let result;
    //const quarterDates = eachQuarterOfInterval({
      //start,
      //end,
    //})
    //result = await createRoutine(quarterDates);
    //console.log(`${result.length} quarter dates updated`)

    //const monthDates = eachMonthOfInterval({
      //start,
      //end,
    //})
    //result = await createRoutine(monthDates);
    //console.log(`${result.length} month dates updated`)

    const dayDates = eachDayOfInterval({
      start,
      end,
    })
    const result = await createRoutine(dayDates);
    console.log(`${result.length} day dates updated`)
  }
}

// TODO optimize: https://stackoverflow.com/questions/70948869/mysql-fastest-way-to-import-125000-line-csv
async function main() {
  //await seedKeywordFilterDropdown();
  //await importPersons();
  await importExportPersons();
  //await importPersonCPALicenses();
  //await importProducts();
  //await importOrders();
  //await importOrderDetails();
  //await importEducationUnits();
  //await importMailingList();

  // data post processing
  //await fillInEmptyMicpaEducationUnitExternalSource();
  //await fillInMicpaAggregatedEducationUnit();
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
