import { useEffect, useState, useRef } from "react"
import { AgGridReact } from "ag-grid-react"
import {
  StartDateTime,
  EndDateTime,
  sentBtn,
  SentIcon,
} from "@/newtelco/ag-grid"
import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"
import useStore from "@/newtelco/store"
import { Rnd } from "react-rnd"
import moment from "moment-timezone"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/material_blue.css"
import Notify from "@/newtelco-utils/notification"
import ConfirmModal from "@/newtelco/confirmmodal"
import Select from "react-select"
import tzOptions from "@/newtelco/maintenance/timezoneOptions"
import {
  Container,
  Row,
  Col,
  FlexboxGrid,
  Whisper,
  Tooltip,
  Icon,
  Loader,
  IconButton,
  FormGroup,
  SelectPicker,
  Modal,
  ButtonGroup,
  Button,
  Input,
  Form,
} from "rsuite"

const rescheduleReasons = [
  {
    value: "change_circuits",
    label: "Change in affected circuits",
  },
  {
    value: "change_time",
    label: "Change in planned date/time",
  },
  {
    value: "change_impact",
    label: "Change in impact duration",
  },
  {
    value: "change_technical",
    label: "Change due to technical reasons",
  },
]

const RescheduleGrid = ({ maintId, user, handleCalendarUpdate }) => {
  const setRescheduleData = useStore((state) => state.setRescheduleData)
  const rescheduleData = useStore((state) => state.rescheduleData)
  const rescheduleGridApi = useRef()
  const [openRescheduleModal, setOpenRescheduleModal] = useState(false)
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false)
  const [reschedule, setReschedule] = useState({
    sdt: null,
    edt: null,
    impact: "",
    reason: "",
  })
  const [rescheduleToDelete, setRescheduleToDelete] = useState({
    id: null,
    rcounter: null,
  })

  useEffect(() => {
    fetch(`/api/reschedule?id=${maintId}`)
      .then((resp) => resp.json())
      .then((data) => {
        setRescheduleData(data)
      })
      .catch((err) => console.error(`Error Loading Reschedules - ${err}`))
  }, [maintId, setRescheduleData])

  const gridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      editable: true,
    },
    columnDefs: [
      {
        headerName: "ID",
        field: "rcounter",
        width: 80,
        editable: false,
        hide: false,
        sort: { direction: "asc", priority: 0 },
      },
      {
        headerName: "Start",
        field: "sdt",
        width: 170,
        cellRenderer: "startdateTime",
      },
      {
        headerName: "End",
        field: "edt",
        width: 170,
        cellRenderer: "enddateTime",
      },
      {
        headerName: "Impact",
        field: "impact",
        width: 140,
        tooltipField: "impact",
      },
      {
        headerName: "Reason",
        field: "reason",
        width: 160,
        tooltipField: "reason",
      },
      {
        headerName: "Sent",
        field: "sent",
        width: 160,
        tooltipField: "reason",
        cellRenderer: "sentIcon",
      },
      {
        headerName: "",
        field: "sent",
        cellRenderer: "sentBtn",
        width: 60,
        sortable: false,
        filter: false,
        pinned: "right",
        cellStyle: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          overflow: "visible",
        },
      },
    ],
    rowSelection: "single",
    paginationPageSize: 10,
    loadingOverlayComponent: "customLoadingOverlay",
    context: {
      moveCalendarEntry: handleCalendarUpdate,
      // toggleRescheduleSentBtn: toggleRescheduleSentBtn,
      toggleRescheduleDelete: toggleConfirmDeleteRescheduleModal,
      maintId,
    },
    frameworkComponents: {
      startdateTime: StartDateTime,
      enddateTime: EndDateTime,
      sentBtn: sentBtn,
      sentIcon: SentIcon,
      customLoadingOverlay: Loader,
    },
  }

  const handleRescheduleGridReady = (params) => {
    rescheduleGridApi.current = params.api
    params.api.setRowData(rescheduleData)
  }

  /// /////////////////////////////////////////////////////////
  //
  //                    RESCHEDULE
  //
  /// /////////////////////////////////////////////////////////

  const handleRescheduleStartDateTimeChange = (date) => {
    const startDateTime = moment(date[0]).format("YYYY-MM-DD HH:mm:ss")
    setReschedule({ ...reschedule, sdt: startDateTime })
  }

  const handleRescheduleEndDateTimeChange = (date) => {
    const endDateTime = moment(date[0]).format("YYYY-MM-DD HH:mm:ss")
    setReschedule({ ...reschedule, edt: endDateTime })
  }

  const handleRescheduleSave = () => {
    const { timezone } = reschedule
    const newStartDateTime = moment
      .tz(reschedule.sdt, timezone)
      .utc()
      .format("YYYY-MM-DD HH:mm:ss")
    const newEndDateTime = moment
      .tz(reschedule.edt, timezone)
      .utc()
      .format("YYYY-MM-DD HH:mm:ss")
    if (reschedule.reason === "" || reschedule.impact === "") {
      Notify("error", "Reason and Impact Required")
      return
    }

    fetch("/api/reschedule", {
      method: "POST",
      body: JSON.stringify({
        mid: maintId,
        impact: reschedule.impact,
        sdt: moment(newStartDateTime).format(),
        edt: moment(newEndDateTime).format(),
        rcounter: rescheduleData.length + 1,
        user: user,
        reason: rescheduleReasons.find(
          (reason) => reason.value === reschedule.reason
        ).label,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          setOpenRescheduleModal(!openRescheduleModal)
          Notify("success", "Reschedule Save Complete")
          const data = rescheduleData
          data.push({
            rcounter: rescheduleData.length + 1,
            sdt: moment(newStartDateTime).format(),
            edt: moment(newEndDateTime).format(),
            impact: reschedule.impact,
            reason: rescheduleReasons.find(
              (reason) => reason.value === reschedule.reason
            ).label,
            sent: 0,
          })

          setRescheduleData(data)

          setReschedule({
            impact: "",
            reason: "",
            sdt: null,
            edt: null,
          })

          rescheduleGridApi.current.setRowData(data)
        }
      })
      .catch((err) => console.error(`Error Saving Reschedule - ${err}`))

    fetch(`/api/reschedule?inc=true&id=${maintId}`).catch((err) =>
      console.error(`Error Incrementing Reschedule - ${err}`)
    )
  }

  const handleRescheduleCellEdit = (params) => {
    const { rcounter } = params.data
    const newStartDateTime = moment(params.data.sdt).format(
      "YYYY.MM.DD HH:mm:ss"
    )
    const newEndDateTime = moment(params.data.edt).format("YYYY.MM.DD HH:mm:ss")
    const newImpact = params.data.impact

    fetch("/api/reschedule", {
      method: "PUT",
      body: JSON.stringify({
        mid: maintId,
        impact: newImpact,
        sdt: moment(newStartDateTime).format(),
        edt: moment(newEndDateTime).format(),
        rcounter,
        user,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", "Reschedule Edit Success")
        }
      })
      .catch((err) => console.error(`Reschedule Edit Error - ${err}`))
  }

  // function toggleRescheduleSentBtn(rcounter, data) {
  //   console.log(rcounter, data)
  //   const newRescheduleData = rescheduleData
  //   // TODO: fix dis!

  //   // const reschedIndex = newRescheduleData.findIndex(el => el.rcounter === rcounter)
  //   // console.log(reschedIndex, newRescheduleData, rcounter)
  //   // console.log(newRescheduleData, rcounter, rcounter - 1)
  //   console.log(newRescheduleData)
  //   const currentSentStatus = newRescheduleData[rcounter - 1].sent
  //   let newSentStatus
  //   if (currentSentStatus === 1) {
  //     newRescheduleData[rcounter - 1].sent = 0
  //     newSentStatus = 0
  //   } else if (currentSentStatus === 0) {
  //     newRescheduleData[rcounter - 1].sent = 1
  //     newSentStatus = 1
  //   }
  //   setRescheduleData(newRescheduleData)

  //   fetch("/api/reschedule?sent=true", {
  //     method: "PUT",
  //     body: JSON.stringify({
  //       mid: maintId,
  //       rcounter: rcounter,
  //       user: user,
  //       setn: newSentStatus,
  //     }),
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //   })
  //     .then((resp) => resp.json())
  //     .then((data) => {
  //       if (data.id) {
  //         Notify("success", "Reschedule Sent Change Success")
  //       }
  //     })
  //     .catch((err) => console.error(`Reschedule Sent Change Error - ${err}`))

  //   rescheduleGridApi.current.refreshCells()
  // }

  function toggleConfirmDeleteRescheduleModal() {
    if (rescheduleGridApi.current) {
      const row = rescheduleGridApi.current.getSelectedRows()
      const rescheduleId = `NT-${maintId}-${row[0].rcounter}`
      setRescheduleToDelete({
        id: rescheduleId,
        rcounter: row[0].rcounter,
      })
      setOpenConfirmDeleteModal(!openConfirmDeleteModal)
    }
  }

  const handleDeleteReschedule = () => {
    fetch("/api/reschedule", {
      method: "DELETE",
      body: JSON.stringify({
        mid: maintId,
        rcounter: rescheduleToDelete.rcounter,
        user,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", "Reschedule Delete Success")
          const newRescheduleData = rescheduleData.filter(
            (resched) => resched.rcounter !== rescheduleToDelete.rcounter
          )
          rescheduleGridApi.current.setRowData(newRescheduleData)
          setOpenConfirmDeleteModal(!openConfirmDeleteModal)
          setRescheduleData(newRescheduleData)
        } else {
          Notify("error", "Reschedule Delete Error")
        }
      })
      .catch((err) => console.error(`Reschedule Delete Error - ${err}`))
  }

  return (
    <Container style={{ padding: "20px" }}>
      <Row style={{ marginBottom: "20px" }}>
        <FlexboxGrid justify="end">
          <FlexboxGrid.Item>
            <Whisper
              placement="bottom"
              speaker={<Tooltip>Create New Reschedule</Tooltip>}
            >
              <IconButton
                appearance="ghost"
                onClick={() => setOpenRescheduleModal(!openRescheduleModal)}
                icon={<Icon icon="clock-o" />}
              >
                Reschedule
              </IconButton>
            </Whisper>
          </FlexboxGrid.Item>
        </FlexboxGrid>
      </Row>
      <Row>
        <Col style={{ width: "100%", height: "400px" }}>
          <div
            className="ag-theme-material"
            style={{
              height: "100%",
              width: "100%",
            }}
          >
            <AgGridReact
              gridOptions={gridOptions}
              rowData={rescheduleData}
              onGridReady={handleRescheduleGridReady}
              pagination
              onCellEditingStopped={handleRescheduleCellEdit}
              animateRows
              immutableData
              getRowNodeId={(data) => {
                return data.rcounter
              }}
              stopEditingWhenGridLosesFocus
            />
          </div>
        </Col>
      </Row>
      {typeof window !== "undefined" && openRescheduleModal && (
        <Rnd
          default={{
            x: window.innterWidth / 2,
            y: 40,
            width: 450,
            height: 650,
          }}
          style={{
            background: "var(--background)",
            overflow: "hidden",
            borderRadius: "5px",
            height: "auto",
            zIndex: "6",
            boxShadow: "0px 0px 10px 1px var(--grey3)",
          }}
          dragHandleClassName="reschedule-header"
        >
          <Modal.Header
            className="reschedule reschedule-header"
            onHide={() => setOpenRescheduleModal(!openRescheduleModal)}
          >
            <FlexboxGrid
              justify="center"
              align="middle"
              style={{ pointerEvents: "none" }}
            >
              <FlexboxGrid.Item
                colspan={24}
                style={{ textAlign: "center", pointerEvents: "none" }}
              >
                <h3 style={{ pointerEvents: "none" }}>
                  Reschedule Maintenance
                </h3>
              </FlexboxGrid.Item>
            </FlexboxGrid>
          </Modal.Header>
          <Modal.Body
            className="modal-body reschedule"
            style={{ marginTop: "0px", paddingBottom: "0px" }}
          >
            <FlexboxGrid
              justify="space-around"
              align="middle"
              style={{ flexDirection: "column", height: "520px" }}
            >
              <FlexboxGrid.Item style={{ padding: "30px" }}>
                <Form>
                  <FormGroup style={{ margin: "20px" }}>
                    <label htmlFor="supplier">Timezone</label>
                    <Select
                      options={tzOptions}
                      name="reschedule-timezone"
                      value={{
                        value: reschedule.timezone,
                        label: reschedule.timezoneLabel,
                      }}
                      onChange={(selection) =>
                        setReschedule({
                          ...reschedule,
                          timezone: selection.value,
                          timezoneLabel: selection.label,
                        })
                      }
                      className="timezone-select"
                    />
                  </FormGroup>
                  <FormGroup style={{ margin: "20px" }}>
                    <label>Start Date/Time</label>
                    <Flatpickr
                      data-enable-time
                      options={{ time_24hr: "true", allowInput: "true" }}
                      className="flatpickr end-date-time"
                      value={reschedule.sdt || null}
                      onChange={(date) =>
                        handleRescheduleStartDateTimeChange(date)
                      }
                    />
                  </FormGroup>
                  <FormGroup style={{ margin: "20px" }}>
                    <label>End Date/Time</label>
                    <Flatpickr
                      data-enable-time
                      options={{ time_24hr: "true", allowInput: "true" }}
                      className="flatpickr end-date-time"
                      value={reschedule.edt || null}
                      onChange={(date) =>
                        handleRescheduleEndDateTimeChange(date)
                      }
                    />
                  </FormGroup>
                  <FormGroup style={{ margin: "20px" }}>
                    <label htmlFor="resched-impact">New Impact</label>
                    <Input
                      id="resched-impact"
                      name="resched-impact"
                      type="text"
                      value={reschedule.impact}
                      onChange={(value) =>
                        setReschedule({ ...reschedule, impact: value })
                      }
                    />
                  </FormGroup>
                  <FormGroup style={{ margin: "20px" }}>
                    <label htmlFor="resched-reason">New Reason</label>
                    <SelectPicker
                      cleanable
                      style={{ width: "100%" }}
                      placement="top"
                      searchable={false}
                      value={reschedule.reason}
                      onChange={(value) =>
                        setReschedule({ ...reschedule, reason: value })
                      }
                      placeholder="Please select a reason for reschedule"
                      data={rescheduleReasons}
                    />
                  </FormGroup>
                </Form>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item colspan={18}>
                <ButtonGroup justified>
                  <Button
                    appearance="subtle"
                    onClick={() => setOpenRescheduleModal(!openRescheduleModal)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleRescheduleSave}>Save</Button>
                </ButtonGroup>
              </FlexboxGrid.Item>
            </FlexboxGrid>
          </Modal.Body>
        </Rnd>
      )}
      {openConfirmDeleteModal && (
        <ConfirmModal
          show={openConfirmDeleteModal}
          onHide={toggleConfirmDeleteRescheduleModal}
          header="Confirm Delete"
          content={`Are you sure you want to delete ${rescheduleToDelete.id}`}
          cancelAction={toggleConfirmDeleteRescheduleModal}
          confirmAction={handleDeleteReschedule}
        />
      )}
    </Container>
  )
}

export default RescheduleGrid
