import { isValid } from "date-fns"
import moment from "moment-timezone"

export const StartDateTime = ({ node }) => {
  let dateTime
  let nodeDateTime = node.data.startdatetime || node.data.sdt
  if (isValid(new Date(nodeDateTime))) {
    const intDateTime = moment.tz(nodeDateTime, "GMT")
    const intDateTime2 = intDateTime.tz("Etc/GMT-2")
    dateTime = intDateTime2.format("DD.MM.YYYY HH:mm")
  } else {
    dateTime = nodeDateTime
  }
  return <span>{dateTime}</span>
}
