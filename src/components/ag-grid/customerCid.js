import { useState } from "react"
import Notify from "@/newtelco-utils/notification"
import { Tag, Whisper, Tooltip } from "rsuite"

export const CustomerCid = ({ data }) => {
  const { kundencid } = data
  const [hover, setHover] = useState(false)
  const copyToClipboard = () => {
    navigator.clipboard.writeText(kundencid)
    Notify("info", "Customer CID Copied to Clipboard")
  }
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {kundencid}
      <Whisper
        placement="bottom"
        speaker={<Tooltip>Copy to Clipboard</Tooltip>}
      >
        <Tag
          style={{
            visibility: hover ? "visible" : "hidden",
            opacity: hover ? "1" : "0",
          }}
          onClick={copyToClipboard}
          className="copy-btn"
        >
          <svg
            height="16"
            width="16"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        </Tag>
      </Whisper>
    </div>
  )
}
