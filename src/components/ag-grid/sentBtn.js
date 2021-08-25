import { Icon, IconButton, Dropdown } from "rsuite"

export const sentBtn = ({ data, context }) => {
  const {
    moveCalendarEntry,
    toggleRescheduleDelete /*, toggleRescheduleSentBtn */,
  } = context
  const { startDateTime, endDateTime, rcounter } = data
  console.log(data, context)
  return (
    <Dropdown
      renderTitle={() => {
        return (
          <IconButton appearance="subtle" icon={<Icon icon="ellipsis-v" />} />
        )
      }}
      placement="leftStart"
    >
      {/* <Dropdown.Item onClick={() => toggleRescheduleSentBtn(rcounter, data)}>
        Toggle Sent
      </Dropdown.Item> */}
      <Dropdown.Item
        onClick={() => moveCalendarEntry(startDateTime, endDateTime, rcounter)}
      >
        Move Calendar
      </Dropdown.Item>
      <Dropdown.Item onClick={toggleRescheduleDelete}>Delete</Dropdown.Item>
    </Dropdown>
  )
}
