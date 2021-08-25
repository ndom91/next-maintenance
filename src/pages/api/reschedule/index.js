import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req
  const { id: maintenanceid, sent, inc } = query

  if (method === "GET" && inc) {
    // Increment reschedule counter
    const incRescheduleQuery = await prisma.maintenance.update({
      data: {
        rescheduled: {
          increment: 1,
        },
      },
      where: {
        id: parseInt(maintenanceid),
      },
    })
    res.status(200).json(incRescheduleQuery)
  } else if (method === "GET") {
    // FIND by Maintenance ID
    const reschedules = await prisma.reschedule.findMany({
      where: {
        maintenanceid: parseInt(maintenanceid),
      },
      select: {
        sdt: true,
        edt: true,
        impact: true,
        rcounter: true,
        reason: true,
        sent: true,
      },
    })
    res.status(200).json(reschedules)
  } else if (method === "POST") {
    // CREATE
    const { mid, impact, sdt, edt, user, rcounter, reason } = body
    const username = user.substring(0, user.lastIndexOf("@"))

    const insertRescheduleQuery = await prisma.reschedule.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        sdt,
        edt,
        impact,
        label: `${mid}_${rcounter}`,
        rcounter,
        reason,
        user: username,
      },
    })

    // Increment reschedule counter
    await prisma.maintenance.update({
      data: {
        rescheduled: {
          increment: 1,
        },
      },
      where: {
        id: parseInt(mid),
      },
    })

    // Insert Changelog
    await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        user: username,
        action: "create",
        field: `reschedule - ${mid}_${rcounter}`,
      },
    })

    res.status(200).json(insertRescheduleQuery)
  } else if (method === "PUT" && sent) {
    // UPDATE sent
    const { mid, sent, user, rcounter } = body
    const username = user.substring(0, user.lastIndexOf("@"))

    const updateRescheduleSentQuery = await prisma.reschedule.update({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        user: username,
        rcounter,
        sent,
      },
      where: {
        maintenanceid_rcounter: {
          rcounter: parseInt(rcounter),
          maintenanceid: parseInt(mid),
        },
      },
    })

    // Insert Changelog
    await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        user: username,
        action: "sent",
        field: `reschedule - ${mid}-${rcounter}`,
      },
    })

    res.status(200).json(updateRescheduleSentQuery)
  } else if (method === "PUT") {
    // EDIT
    const { mid, impact, sdt, edt, user, rcounter, reason } = body
    const username = user.substring(0, user.lastIndexOf("@"))

    const updateRescheduleQuery = await prisma.reschedule.update({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        impact,
        sdt,
        edt,
        user: username,
        rcounter,
        reason,
      },
      where: {
        maintenanceid_rcounter: {
          rcounter: parseInt(rcounter),
          maintenanceid: parseInt(mid),
        },
      },
    })

    // Insert Changelog
    await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        user: username,
        action: "edit",
        field: `reschedule - ${mid}_${rcounter}`,
      },
    })

    res.status(200).json(updateRescheduleQuery)
  } else if (method === "DELETE") {
    // DELETE
    const { mid, user, rcounter } = body
    const username = user.substring(0, user.lastIndexOf("@"))

    // Delete actual reschedule entry
    const deleteRescheduleQuery = await prisma.reschedule.delete({
      where: {
        maintenanceid_rcounter: {
          rcounter: parseInt(rcounter),
          maintenanceid: parseInt(mid),
        },
      },
    })

    // Decrement reschedule counter
    await prisma.maintenance.update({
      data: {
        rescheduled: {
          decrement: 1,
        },
      },
      where: {
        id: parseInt(mid),
      },
    })

    // Insert Changelog
    await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(mid),
          },
        },
        user: username,
        action: "delete",
        field: `reschedule - ${mid}_${rcounter}`,
      },
    })

    res.status(200).json(deleteRescheduleQuery)
  } else {
    res.setHeader("Allow", ["PUT", "GET", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
