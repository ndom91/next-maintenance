const db = require('../../../../../../lib/db')
const escape = require('sql-template-strings')

module.exports = async (req, res) => {
  const element = req.query.element
  const maintId = req.query.maintId
  const value = req.query.value
  const updatedBy = req.query.updatedby
  let cidIdsQuery
  if (element === 'start') {
    cidIdsQuery = await db.query(escape`
      UPDATE maintenancedb SET startDateTime = ${value}, updatedBy = ${updatedBy} WHERE id = ${maintId}
    `)
  } else if (element === 'end') {
    cidIdsQuery = await db.query(escape`
      UPDATE maintenancedb SET endDateTime = ${value}, updatedBy = ${updatedBy} WHERE id = ${maintId}
    `)
  }
  if (cidIdsQuery.affectedRows >= 1) {
    const fieldName = `${element} date/time`
    const updateHistory = await db.query(escape`INSERT INTO changelog (mid, user, action, field) VALUES (${maintId}, ${updatedBy}, 'change', ${fieldName});`)
    res.status(200).json({ statusText: 'OK', status: 200 })
  } else {
    res.status(200).json({ statusText: 'FAIL', status: 500, err: 'Save Failed' })
  }
}