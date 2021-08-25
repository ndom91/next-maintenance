import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, method } = req

  if (method === "GET" && query.domain) {
    const companies = await prisma.company.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
      where: {
        maildomain: {
          contains: query.domain,
        },
      },
    })
    res.status(200).json(companies)
  } else if (method === "GET" && query.maintId) {
    const companies = await prisma.maintenance.findMany({
      where: {
        suppliercompany: {
          is: {
            id: parseInt(query.maintId),
          },
        },
      },
      // include: {
      //   suppliercircuits: true,
      //   suppliercompany: true,
      // },
      select: {
        id: true,
        sendermaintenanceid: true,
        maileingang: true,
        receivedmail: true,
        bearbeitetvon: true,
        betroffenekunden: true,
        startdatetime: true,
        enddatetime: true,
        postponed: true,
        notes: true,
        mailsentat: true,
        updatedat: true,
        betroffenecids: true,
        done: true,
        cancelled: true,
        emergency: true,
        rescheduled: true,
        suppliercompany: {
          select: {
            maildomain: true,
            name: true,
          },
        },
      },
    })

    res.status(200).json(companies)
  } else if (method === "GET") {
    const companies = await prisma.company.findMany()

    if (query.select) {
      const selectCompanies = companies.map((company) => {
        return {
          value: company.id,
          label: company.name,
        }
      })
      res.status(200).json(selectCompanies)
      return
    }
    if (query.mail) {
      const domainCompanies = companies.map((company) => {
        return {
          value: company.maildomain,
          label: company.name,
        }
      })
      res.status(200).json(domainCompanies)
      return
    }

    res.status(200).json(companies)
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
