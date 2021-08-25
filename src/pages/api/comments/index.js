import prisma from "../../../lib/prisma"

export default async function handle(req, res) {
  const { query, body, method } = req

  if (method === "GET") {
    // FIND by Maintenance ID
    const maintId = query.m
    const comments = await prisma.comment.findMany({
      where: {
        maintid: parseInt(maintId),
      },
    })

    res.status(200).json({ comments })
  } else if (method === "POST") {
    // CREATE new comment
    const { comment, user, id } = body
    const username = user.substring(0, user.lastIndexOf("@"))

    const insertCommentQuery = await prisma.comment.create({
      data: {
        maint: {
          connect: {
            id: parseInt(id),
          },
        },
        body: comment,
        user: username,
      },
    })
    res.status(200).json(insertCommentQuery)
  } else if (method === "DELETE") {
    // DELETE comment
    const { id } = body

    const deleteCommentQuery = await prisma.comment.delete({
      where: {
        id,
      },
    })

    res.status(200).json(deleteCommentQuery)
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}
