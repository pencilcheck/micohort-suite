// api/test.js
import type { NextApiRequest, NextApiResponse } from 'next'
import type { MailingListsOnPersons, MicpaPerson, Prisma } from '@prisma/client'

import { prisma } from "../../../server/db";
import { capitalize } from 'lodash';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('export query', req.query)

  // req.query.id - mailing list id
  // req.query.select - select object (stringified) to be passed into prism

  try {
    const list = await prisma.mailingListsOnPersons.findMany({
      include: {
        mailingList: {
          select: {
            title: true,
          }
        },
        person: {
          select: JSON.parse(req.query.select as string ?? '') as Prisma.MicpaPersonSelect
        },
      },
      where: {
        mailingListId: req.query.id as string
      }
    });

    const headers = Object.keys(JSON.parse(req.query.select as string ?? '') as Prisma.MicpaPersonSelect || {})
    const content = list
      ? list.map<string>((l) => {
        return headers.map((h: string) => `"${String(l.person[h as keyof MicpaPerson])}"`).join(',')
      }).join('\r\n')
      : '';

    const file = `${headers.map(k => capitalize(k)).join(',')}\r\n${content}`;

    const fileData = file;
    const fileName = `${list[0]?.mailingList.title || 'mailing list content'}.csv`;
    const fileType = 'text/csv';

    res.writeHead(200, {
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': fileType,
    })

    const download = Buffer.from(fileData)
    res.end(download)
  } catch(err) {
    console.log(err);
    // err
    res.status(500).send(err)
  }
}

export default handler;
