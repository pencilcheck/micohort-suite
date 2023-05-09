import indexOf from 'lodash/indexOf'
import flatten from 'lodash/flatten'
import compact from 'lodash/compact'
import { MicpaEducationUnit, MicpaProduct, PrismaClient } from '@prisma/client'
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
  // Products
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwProducts.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwProducts.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(10000));
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
}

async function importOrders() {
  // Orders
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwOrders.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwOrders.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(10000));
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
  // OrderDetails
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwOrderDetails.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwOrderDetails.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(10000));
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
  // PersonCPALicenses
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwPersonCPALicenses.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwPersonCPALicenses.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(10000));
  for (const chunks of i) {
    const filterChunks = (rows: string[][]) => {
      return rows.filter(r => {
        return true
      })
    }
    const personLicenses = await prisma.personLicense.createMany({
      data: filterChunks(chunks).map(row => ({
        id: row[indexOf<string>(columns, 'ID')] as string,
        laraStatus: row[indexOf<string>(columns, 'MICPA_LARAStatus')]?.trim() || 'Active',
        licenseDate: row[indexOf<string>(columns, 'LicenseDate')]?.trim() || '',
      })),
      skipDuplicates: true,
    })
    console.log(`${personLicenses.count} personLicenses imported`)
  }
}

async function importEducationUnits() {
  // EducationUnits
  const columns = flatten(
    await streamAsPromise(readStreamForColumn("../data/vwEducationUnits.csv")).catch(() => [])
  );
  const rows = await streamAsPromise(readStreamForData("../data/vwEducationUnits.csv")).catch(() => []);

  // ref: https://github.com/prisma/prisma/issues/9196
  const i = pipe(rows, page(10000));
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
      take: 100,
    });

    // TODO set timeout to slow down the request so planetscale wouldn't drop my connection
    await Promise.all(
      educationUnits.map((unit: { id: string, product: MicpaProduct | null }) => {
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
    console.log(`${educationUnits.length} education units externalsource updated`)
  } while (educationUnits.length > 0)
}

async function seedKeywordFilterDropdown() {
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

async function main() {
  //await importPersons();
  //await importProducts();
  //await importOrders();
  //await importOrderDetails();
  //await importEducationUnits();
  //await importMailingList();
  await importPersonCPALicenses();
  //await fillInEmptyMicpaEducationUnitExternalSource();
  //await seedKeywordFilterDropdown();
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
