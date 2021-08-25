import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req

  if (method === "POST") {
    // POST /api/settings/companies
    const { name, domain, recipient } = body
    const company = await prisma.company.create({
      data: {
        name,
        maildomain: domain,
        maintenancerecipient: recipient,
      },
    })
    res.status(200).json(company)
  } else if (method === "PUT") {
    // PUT /api/settings/companies
    const { id, name, domain, recipient } = body
    const company = await prisma.company.update({
      data: {
        name,
        maildomain: domain,
        maintenancerecipient: recipient,
      },
      where: {
        id,
      },
    })
    res.status(200).json(company)
  } else if (method === "DELETE") {
    // DELETE /api/settings/companies
    const { id } = query
    const company = await prisma.company.delete({
      where: {
        id: Number(id),
      },
    })
    res.status(200).json(company)
  } else {
    res.setHeader("Allow", ["PUT", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
