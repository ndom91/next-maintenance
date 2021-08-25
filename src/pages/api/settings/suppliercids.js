import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req

  if (method === "GET") {
    const supplierCircuit = await prisma.supplierCircuit.findMany({
      include: {
        company: true,
      },
    })
    res.status(200).json(supplierCircuit)
  } else if (method === "POST") {
    // POST /api/settings/suppliercids
    const { company, cid } = body
    const supplierCircuit = await prisma.supplierCircuit.create({
      data: {
        company: {
          connect: {
            id: company,
          },
        },
        derencid: cid,
      },
    })
    res.status(200).json(supplierCircuit)
  } else if (method === "PUT") {
    // PUT /api/settings/suppliercids
    const { id, suppliercid } = body
    const supplierCircuit = await prisma.supplierCircuit.update({
      data: {
        derencid: suppliercid,
      },
      where: {
        id,
      },
    })
    res.status(200).json(supplierCircuit)
  } else if (method === "DELETE") {
    // DELETE /api/settings/suppliercids
    const { id } = query
    const supplierCircuit = await prisma.supplierCircuit.delete({
      where: {
        id: Number(id),
      },
    })
    res.status(200).json(supplierCircuit)
  } else {
    res.setHeader("Allow", ["PUT", "GET", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
