import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req

  if (method === "GET") {
    // GET /api/settings/freeze
    const freeze = await prisma.freeze.findMany({
      include: {
        company: true,
      },
    })
    res.status(200).json(freeze)
  } else if (method === "POST") {
    // POST /api/settings/freeze
    const { companyid, startdatetime, enddatetime, notes } = body
    const freeze = await prisma.freeze.create({
      data: {
        company: {
          connect: {
            id: companyid,
          },
        },
        startdatetime,
        enddatetime,
        notes,
      },
    })
    res.status(200).json(freeze)
  } else if (method === "PUT") {
    // PUT /api/settings/freeze
    const { id, startdate, enddate, notes } = body
    const freeze = await prisma.freeze.update({
      data: {
        startdatetime: startdate,
        enddatetime: enddate,
        notes,
      },
      where: {
        id,
      },
    })
    res.status(200).json(freeze)
  } else if (method === "DELETE") {
    // DELETE /api/settings/freeze
    const { id } = query
    const freeze = await prisma.freeze.delete({
      where: {
        id: Number(id),
      },
    })
    res.status(200).json(freeze)
  } else {
    res.setHeader("Allow", ["GET", "PUT", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
