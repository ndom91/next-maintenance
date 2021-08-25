import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { body, query, method } = req
  const { maintId, user, field, action } = body

  if (method === "GET") {
    // Get changelog for a maintenance
    const { mid } = query
    const findChangelog = await prisma.changelog.findMany({
      where: {
        maintenanceid: parseInt(mid),
      },
    })

    res.status(200).json(findChangelog)
  } else if (method === "POST") {
    const username = user.substring(0, user.lastIndexOf("@"))
    // Insert Changelog
    const changelogInsert = await prisma.changelog.create({
      data: {
        maintenance: {
          connect: {
            id: parseInt(maintId),
          },
        },
        user: username,
        action,
        field,
      },
    })

    res.status(200).json(changelogInsert)
  } else {
    res.setHeader("Allow", ["GET", "POST"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
