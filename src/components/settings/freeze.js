import { useEffect, useRef, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import Select from "react-select"
import { StartDateTime, EndDateTime } from "@/newtelco/ag-grid"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/airbnb.css"
import moment from "moment-timezone"
import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"
import Notify from "@/newtelco-utils/notification"
import ConfirmModal from "@/newtelco/confirmmodal"
import {
  Panel,
  Button,
  IconButton,
  ButtonGroup,
  Icon,
  Modal,
  FlexboxGrid,
  Form,
  FormGroup,
  Input,
  ControlLabel,
  Loader,
} from "rsuite"

const Freeze = () => {
  const gridApi = useRef()
  const [openFreezeAdd, setOpenFreezeAdd] = useState(false)
  const [openConfirmDeleteModal, setOpenConfirmDelete] = useState(false)
  const [rowData, setRowData] = useState([])
  const [companySelections, setCompanySelections] = useState([])
  const [newCompany, setNewCompany] = useState({})
  const [newNotes, setNewNotes] = useState("")
  const [newStartDateTime, setNewStartDateTime] = useState("")
  const [newEndDateTime, setNewEndDateTime] = useState("")
  const [freezeIdToDelete, setFreezeIdToDelete] = useState("")
  const [freezeCompanyToDelete, setFreezeCompanyToDelete] = useState("")
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
        field: "id",
        width: 80,
        editable: false,
        sort: { direction: "asc", priority: 1 },
      },
      {
        headerName: "Company",
        field: "company.name",
        width: 200,
        editable: false,
      },
      {
        headerName: "Start Date",
        field: "startdatetime",
        width: 200,
        cellRenderer: "startdateTime",
      },
      {
        headerName: "End Date",
        field: "enddatetime",
        width: 200,
        cellRenderer: "enddateTime",
      },
      {
        headerName: "Notes",
        field: "notes",
        width: 300,
      },
    ],
    rowSelection: "single",
    frameworkComponents: {
      startdateTime: StartDateTime,
      enddateTime: EndDateTime,
      customLoadingOverlay: Loader,
    },
    loadingOverlayComponent: "customLoadingOverlay",
  }

  useEffect(() => {
    fetch("/api/settings/freeze")
      .then((resp) => resp.json())
      .then((data) => {
        gridApi.current.hideOverlay()
        setRowData(data)
      })
      .catch((err) => console.error(err))
    // fill Companies Select
    fetch("/api/companies?select=true")
      .then((resp) => resp.json())
      .then((data) => {
        setCompanySelections(data)
      })
      .catch((err) => console.error(`Error - ${err}`))
  }, [])

  const handleGridReady = (params) => {
    gridApi.current = params.api
    gridApi.current.showLoadingOverlay()
    params.api.sizeColumnsToFit()
  }

  const toggleFreezeAddModal = () => {
    setOpenFreezeAdd(!openFreezeAdd)
  }

  const handleCompanyChange = (selectedOption) => {
    setNewCompany({
      value: selectedOption.value,
      label: selectedOption.label,
    })
  }

  const handleNewStartChange = (date) => {
    const startDate = moment(date[0]).format("YYYY-MM-DD HH:mm:ss")
    setNewStartDateTime(startDate)
  }

  const handleNewEndChange = (date) => {
    const endDate = moment(date[0]).format("YYYY-MM-DD HH:mm:ss")
    setNewEndDateTime(endDate)
  }

  const handleDelete = () => {
    fetch(`/api/settings/freeze?id=${freezeIdToDelete}`, {
      method: "DELETE",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `Freeze for ${freezeCompanyToDelete} Deleted`)
        } else {
          Notify("warning", "Error", data.err)
        }
      })
      .catch((err) => console.error(err))

    const newRowData = rowData.filter((el) => el.id !== freezeIdToDelete)
    setRowData(newRowData)
    setOpenConfirmDelete(!openConfirmDeleteModal)
  }

  const toggleFreezeDeleteModal = () => {
    if (gridApi.current) {
      const row = gridApi.current.getSelectedRows()
      if (row[0]) {
        setOpenConfirmDelete(!openConfirmDeleteModal)
        setFreezeIdToDelete(row[0].id)
        setFreezeCompanyToDelete(row[0].company.name)
      } else {
        Notify("warning", "Please select a freeze")
      }
    }
  }

  const handleFreezeAdd = () => {
    fetch(`/api/settings/freeze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyid: newCompany.value,
        startdatetime: new Date(newStartDateTime).toISOString(),
        enddatetime: new Date(newEndDateTime).toISOString(),
        notes: newNotes,
      }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `Freeze for ${newCompany.label} Added`)
        } else {
          Notify("warning", "Error", data.err)
        }
        const newRowData = rowData
        newRowData.push({
          id: data.id,
          company: {
            name: newCompany.label,
            id: newCompany.value,
          },
          companyid: newCompany.value,
          startdatetime: newStartDateTime,
          enddatetime: newEndDateTime,
          notes: newNotes,
        })
        setRowData(newRowData)
        setOpenFreezeAdd(!openFreezeAdd)
        setNewCompany({
          value: "",
          label: "",
        })
        setNewNotes("")
        setNewStartDateTime()
        setNewEndDateTime()
        gridApi.current.setRowData(newRowData)
      })
      .catch((err) => console.error(err))
  }

  const handleCellEdit = (params) => {
    const id = params.data.id
    const startdate = moment(params.data.startdatetime).format(
      "YYYY.MM.DD HH:mm:ss"
    )
    const enddate = moment(params.data.enddatetime).format(
      "YYYY.MM.DD HH:mm:ss"
    )
    const notes = params.data.notes

    fetch(`/api/settings/freeze`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: id,
        startdate: new Date(startdate).toISOString(),
        enddate: new Date(enddate).toISOString(),
        notes: notes,
      }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${params.data.company.name} Freeze Updated`)
        } else {
          Notify("warning", "Error", data.err)
        }
      })
      .catch((err) => console.error(err))
  }

  const Header = () => {
    return (
      <FlexboxGrid justify="end" align="middle">
        <FlexboxGrid.Item>
          <ButtonGroup>
            <IconButton
              onClick={toggleFreezeAddModal}
              icon={<Icon icon="plus-circle" />}
              appearance="ghost"
              placement="right"
            >
              Add
            </IconButton>
            <IconButton
              onClick={toggleFreezeDeleteModal}
              icon={<Icon icon="trash" />}
              appearance="ghost"
              placement="right"
            >
              Delete
            </IconButton>
          </ButtonGroup>
        </FlexboxGrid.Item>
      </FlexboxGrid>
    )
  }

  return (
    <div style={{ width: "100%" }} className="section">
      <Panel header={<Header />}>
        <div
          className="ag-theme-material"
          style={{
            height: "700px",
            width: "100%",
          }}
        >
          <AgGridReact
            gridOptions={gridOptions}
            onGridReady={handleGridReady}
            animateRows
            onCellEditingStopped={handleCellEdit}
            rowData={rowData}
            stopEditingWhenGridLosesFocus
            immutableData
            getRowNodeId={(data) => {
              return data.id
            }}
          />
        </div>
      </Panel>
      {openConfirmDeleteModal && (
        <ConfirmModal
          show={openConfirmDeleteModal}
          onHide={toggleFreezeDeleteModal}
          header="Confirm Delete"
          content={`Are you sure you want to delete ${freezeCompanyToDelete} (${freezeIdToDelete})`}
          cancelAction={toggleFreezeDeleteModal}
          confirmAction={handleDelete}
        />
      )}
      {openFreezeAdd && (
        <Modal
          backdrop
          show={openFreezeAdd}
          size="xs"
          onHide={toggleFreezeAddModal}
        >
          <Modal.Header>New Freeze</Modal.Header>
          <Modal.Body style={{ paddingBottom: "0px" }}>
            <FlexboxGrid
              justify="space-around"
              align="middle"
              style={{ flexDirection: "column", height: "450px" }}
            >
              <FlexboxGrid.Item
                style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}
              >
                <Form>
                  <FormGroup>
                    <ControlLabel>Customer</ControlLabel>
                    <Select
                      value={newCompany}
                      className="company-select"
                      onChange={handleCompanyChange}
                      options={companySelections}
                      noOptionsMessage={() => "No Companies Available"}
                      placeholder="Please Select a Company"
                      style={{ zIndex: "9999" }}
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>Start Date/Time (in GMT)</ControlLabel>
                    <Flatpickr
                      value={newStartDateTime}
                      data-enable-time
                      className="flatpickr"
                      onChange={handleNewStartChange}
                      options={{
                        time_24hr: "true",
                        allowInput: "true",
                      }}
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>End Date/Time (in GMT)</ControlLabel>
                    <Flatpickr
                      value={newEndDateTime}
                      data-enable-time
                      className="flatpickr"
                      onChange={handleNewEndChange}
                      options={{
                        time_24hr: "true",
                        allowInput: "true",
                      }}
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>Notes</ControlLabel>
                    <Input
                      name="notes"
                      type="text"
                      componentClass="textarea"
                      value={newNotes}
                      onChange={(value) => setNewNotes(value)}
                    />
                  </FormGroup>
                </Form>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item>
                <ButtonGroup block style={{ width: "20em" }}>
                  <Button
                    appearance="default"
                    onClick={toggleFreezeAddModal}
                    style={{ width: "50%" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    onClick={handleFreezeAdd}
                    style={{ width: "50%" }}
                  >
                    Confirm
                  </Button>
                </ButtonGroup>
              </FlexboxGrid.Item>
            </FlexboxGrid>
          </Modal.Body>
        </Modal>
      )}
    </div>
  )
}

export default Freeze
