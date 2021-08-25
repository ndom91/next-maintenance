import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req

  if (method === "POST") {
    const { companys, startdate, enddate } = body

    const maintenances = await prisma.freeze.findMany({
      include: {
        company: true,
      },
      where: {
        AND: {
          companyid: {
            in: companys,
          },
          OR: [
            {
              startdatetime: {
                lte: startdate,
              },
              enddatetime: {
                gte: enddate,
              },
            },
          ],
        },
      },
    })

    res.status(200).json(maintenances)
  } else {
    res.setHeader("Allow", ["POST"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
