export const ProtectedIcon = ({ node }) => {
  if (node && node.data) {
    if (node.data.protected == 1 || node.data.protected == true) {
      // Lock Closed
      return (
        <div style={{ height: "32px", width: "32px" }}>
          <svg height="24" width="24" fill="var(--primary)" viewBox="0 0 20 20">
            <path
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
              fillRule="evenodd"
            />
          </svg>
        </div>
      )
    } else if (node.data.protected == 0 || node.data.protected == false) {
      // Lock Open
      return (
        <div style={{ height: "32px", width: "32px" }}>
          <svg height="24" width="24" fill="var(--grey5)" viewBox="0 0 20 20">
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
          </svg>
        </div>
      )
    } else {
      // Question Mark
      return (
        <div style={{ height: "32px", width: "32px" }}>
          <svg height="24" width="24" fill="var(--grey3)" viewBox="0 0 20 20">
            <path
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
              fillRule="evenodd"
            />
          </svg>
        </div>
      )
    }
  } else {
    // Question Mark
    return (
      <div style={{ height: "32px", width: "32px" }}>
        <svg height="24" width="24" fill="var(--grey3)" viewBox="0 0 20 20">
          <path
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
            fillRule="evenodd"
          />
        </svg>
      </div>
    )
  }
}
