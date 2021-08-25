import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req
  const { mid } = query

  if (method === "GET" && mid) {
    const maintenances = await prisma.maintenance.findUnique({
      where: {
        id: parseInt(mid),
      },
      include: {
        suppliercompany: {
          select: {
            name: true,
            maildomain: true,
          },
        },
      },
    })

    res.status(200).json(maintenances)
  } else if (method === "GET") {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        suppliercompany: {
          select: {
            name: true,
            maildomain: true,
          },
        },
        maintenancesupplier: {
          include: {
            suppliercircuit: true,
          },
        },
      },
    })

    res.status(200).json(maintenances)
  } else if (method === "DELETE") {
    const { maintId } = query
    const maintenanceInactive = await prisma.maintenance.update({
      data: {
        active: false,
      },
      where: {
        id: parseInt(maintId),
      },
    })
    res.status(200).json(maintenanceInactive)
  } else if (method === "POST") {
    // const bearbeitetvon = req.body.bearbeitetvon
    // const lieferant = req.body.lieferant
    // const mailId = req.body.mailId
    // const updatedAt = req.body.updatedAt
    // const incomingMailDate = req.body.maileingang

    // const insertQuery = await db.query(
    //   escape`INSERT INTO maintenancedb (bearbeitetvon, receivedmail, lieferant, updatedAt, maileingang) VALUES (${bearbeitetvon}, ${mailId}, ${lieferant}, ${updatedAt}, ${incomingMailDate});`
    // )
    // const getLastInsertedID = await db.query("SELECT LAST_INSERT_ID();")
    // const newId = getLastInsertedID[0]

    // if (insertQuery.affectedRows >= 1) {
    //   const updateHistory = await db.query(
    //     escape`INSERT INTO changelog (mid, user, action) VALUES (${newId["LAST_INSERT_ID()"]}, ${bearbeitetvon}, 'created');`
    //   )
    //   res.status(200).json({
    //     statusText: "OK",
    //     status: 200,
    //     newId: newId,
    //     update: updateHistory,
    //   })
    // } else {
    //   res
    //     .status(200)
    //     .json({ statusText: "FAIL", status: 500, err: "Save Failed" })
    // }
    const { bearbeitetvon, lieferant, mailid, updatedat, maileingang } = body
    const maintenanceCreate = await prisma.maintenance.create({
      data: {
        bearbeitetvon,
        receivedmail: mailid,
        supplierid: lieferant,
        updatedat,
        maileingang,
      },
      include: {
        suppliercompany: true,
      },
    })
    // Insert Changelog
    await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: maintenanceCreate.id,
          },
        },
        user: bearbeitetvon,
        action: "created",
      },
    })
    res.status(200).json(maintenanceCreate)
  } else if (method === "PUT") {
    const { id, values, user, field } = body
    const {
      cancelled,
      sendermaintenanceid,
      done,
      emergency,
      startdatetime,
      enddatetime,
      impact,
      location,
      reason,
      maintnote,
      supplier,
      suppliercids,
      timezone,
    } = values

    const maintenanceSave = await prisma.maintenance.update({
      data: {
        cancelled,
        sendermaintenanceid,
        done,
        emergency,
        startdatetime,
        enddatetime,
        impact,
        location,
        reason,
        maintnote,
        supplierid: supplier,
        derencidid: suppliercids,
        timezone,
      },
      where: {
        id: parseInt(id),
      },
    })

    const fieldName = {
      cancelled: "cancelled",
      done: "done",
      emergency: "emergency",
      startDateTime: "start date/time",
      endDateTime: "end date/time",
      impact: "impact",
      location: "location",
      reason: "reason",
      maintNote: "notes",
      supplier: "supplier",
      supplierCids: "supplier cids",
      timezone: "timezone",
      senderMaintenanceId: "sender maintenance id",
    }

    // Insert Changelog
    await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(id),
          },
        },
        user,
        action: "changed",
        field: fieldName[field],
      },
    })

    res.status(200).json(maintenanceSave)
  } else {
    res.setHeader("Allow", ["GET", "PUT", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
