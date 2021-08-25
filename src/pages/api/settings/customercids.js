import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req
  const { cids } = body

  if (method === "GET") {
    // GET /api/settings/customercids
    const customerCids = await prisma.customerCircuit.findMany({
      include: {
        kundecompany: true,
        lieferant: true,
      },
    })
    res.status(200).json(customerCids)
  } else if (method === "POST" && cids) {
    // POST /api/settings/customercids { cids: ["..."] }
    const customerCircuit = await prisma.supplierCircuit.findMany({
      where: {
        id: {
          in: cids,
        },
      },
      select: {
        id: true,
        derencid: true,
        kundencid: {
          include: {
            kundecompany: true,
          },
        },
        company: {
          select: {
            name: true,
            maintenancerecipient: true,
          },
        },
      },
    })
    res.status(200).json(customerCircuit)
  } else if (method === "POST") {
    // POST /api/settings/customercids
    const { customercid, company, protection, supplier } = body
    const customerCircuit = await prisma.customerCircuit.create({
      data: {
        kundencid: customercid,
        protected: protection,
        lieferant: {
          connect: {
            id: supplier,
          },
        },
        kundecompany: {
          connect: {
            id: company,
          },
        },
      },
    })
    res.status(200).json(customerCircuit)
  } else if (method === "PUT") {
    // PUT /api/settings/customercids
    const { id, kundencid, protection } = body
    const customerCircuit = await prisma.customerCircuit.update({
      data: {
        kundencid,
        protected: protection.toString(),
      },
      where: {
        id,
      },
    })
    res.status(200).json(customerCircuit)
  } else if (method === "DELETE") {
    // DELETE /api/settings/customercids
    const { id } = query
    const customerCircuit = await prisma.customerCircuit.delete({
      where: {
        id: Number(id),
      },
    })
    res.status(200).json(customerCircuit)
  } else {
    res.setHeader("Allow", ["PUT", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
