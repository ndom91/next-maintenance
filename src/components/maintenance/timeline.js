import { useState, useEffect } from "react"
import { Loader, Timeline, Icon } from "rsuite"
import format from "date-fns/format"

const Changelog = ({ maintId }) => {
  const [fetching, setFetching] = useState(false)
  const [maintHistory, setMaintHistory] = useState([])

  useEffect(() => {
    setFetching(true)
    fetch(`/api/changelog?mid=${maintId}`)
      .then((resp) => resp.json())
      .then((data) => {
        setMaintHistory(data)
        setFetching(false)
      })
      .catch((err) => console.error(err))
  }, [maintId])

  if (maintHistory.length) {
    return (
      <Timeline align="left">
        {maintHistory.map((item) => {
          let dot
          if (/.cid/.test(item.field)) {
            dot = "realtime"
          } else if (!item.field && item.action === "created") {
            dot = "file-text-o"
          } else if (item.field === "supplier") {
            dot = "briefcase"
          } else if (item.field === "impact") {
            dot = "remind"
          } else if (item.field === "reason") {
            dot = "retention"
          } else if (/calendar./.test(item.field)) {
            dot = "calendar-plus-o"
          } else if (item.field === "timezone") {
            dot = "globe"
          } else if (/.date\/time/.test(item.field)) {
            dot = "clock-o"
          } else if (item.field === "cancelled") {
            dot = "ban"
          } else if (item.field === "emergency") {
            dot = "hospital-o"
          } else if (item.field === "location") {
            dot = "map-marker"
          } else if (item.field && item.action === "sent to") {
            dot = "at"
          } else if (item.field === "notes" || item.field === "maintNote") {
            dot = "comment"
          } else if (item.field === "done") {
            dot = "check"
          } else {
            dot = "question"
          }
          return (
            <Timeline.Item key={item.id} dot={<Icon icon={dot} />}>
              <p>{format(new Date(item.datetime), "LLL dd, HH:mm")}</p>
              <p>
                {item.user} {item.action || ""} {item.field || ""}
              </p>
            </Timeline.Item>
          )
        })}
      </Timeline>
    )
  } else {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "150px",
        }}
      >
        {fetching ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              width: "100%",
            }}
          >
            <Loader />
          </div>
        ) : (
          <h4
            style={{
              fontWeight: "100 !important",
              marginTop: "20px",
              color: "var(--font-color)",
            }}
          >
            No History Available
          </h4>
        )}
      </div>
    )
  }
}

export default Changelog
