import React, { useRef, useState } from "react"
import { getSession } from "next-auth/client"
import "./history.css"
import Layout from "@/newtelco/layout"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"
import moment from "moment-timezone"
import Router from "next/router"
import RequireLogin from "@/newtelco/require-login"
import MaintPanel from "@/newtelco/panel"
import Notify from "@/newtelco-utils/notification"
import ConfirmModal from "@/newtelco/confirmmodal"
import {
  EditBtn,
  MaintId,
  StartDateTime,
  EndDateTime,
  MailArrived,
  UpdatedAt,
  Supplier,
  SupplierCidId,
  RescheduledIcon,
  CompleteIcon,
  EdittedBy,
} from "@/newtelco/ag-grid"
import {
  IconButton,
  ButtonGroup,
  FlexboxGrid,
  SelectPicker,
  Loader,
} from "rsuite"

const History = ({ session, data }) => {
  const gridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },
    columnDefs: [
      {
        headerName: "",
        width: 80,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: "editBtn",
        pinned: "left",
      },
      {
        headerName: "ID",
        field: "id",
        width: 110,
        pinned: "left",
        cellRenderer: "maintId",
        sort: "desc",
      },
      {
        headerName: "By",
        field: "bearbeitetvon",
        cellRenderer: "edittedby",
        tooltipField: "bearbeitetvon",
        width: 100,
        cellStyle: () => {
          return {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }
        },
      },
      {
        headerName: "Supplier",
        field: "suppliercompany.name",
        width: 240,
        cellRenderer: "supplier",
        cellStyle: () => {
          return {
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
          }
        },
      },
      {
        headerName: "Supplier CID",
        cellRenderer: "supplierCidId",
        field: "maintenancesupplier",
        tooltipField: "derenCID",
      },
      {
        headerName: "Sender Maint ID",
        field: "sendermaintenanceid",
        tooltipField: "senderMaintenanceId",
      },
      {
        headerName: "Start",
        field: "startdatetime",
        width: 160,
        cellRenderer: "startdateTime",
      },
      {
        headerName: "End",
        field: "enddatetime",
        width: 160,
        cellRenderer: "enddateTime",
      },
      {
        headerName: "Newtelco CIDs",
        field: "betroffenecids",
        tooltipField: "betroffeneCIDs",
      },
      {
        headerName: "Mail Arrived",
        field: "maileingang",
        cellRenderer: "mailArrived",
      },
      {
        headerName: "Last Updated",
        field: "updatedat",
        cellRenderer: "updatedAt",
      },
      {
        headerName: "Rescheduled",
        field: "rescheduled",
        width: 150,
        cellRenderer: "rescheduledIcon",
        cellStyle: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        },
      },
      {
        headerName: "Complete",
        field: "done",
        resizable: false,
        sortable: false,
        filter: false,
        width: 105,
        pinned: "right",
        cellRenderer: "complete",
      },
    ],
    context: { componentParent: this },
    frameworkComponents: {
      editBtn: EditBtn,
      maintId: MaintId,
      startdateTime: StartDateTime,
      enddateTime: EndDateTime,
      mailArrived: MailArrived,
      updatedAt: UpdatedAt,
      supplier: Supplier,
      supplierCidId: SupplierCidId,
      complete: CompleteIcon,
      edittedby: EdittedBy,
      rescheduledIcon: RescheduledIcon,
    },
    rowSelection: "multiple",
    paginationPageSize: 10,
    rowClass: "row-class",
    rowClassRules: {
      "row-completed": (params) => {
        const done = params.data.done
        if (done === "true" || done === "1") {
          return true
        }
        return false
      },
      "row-cancelled": (params) => {
        const cancelled = params.data.cancelled
        if (cancelled === "true" || cancelled === "1") {
          return true
        }
        return false
      },
      "row-emergency": (params) => {
        const emergency = params.data.emergency
        if (emergency === "true" || emergency === "1") {
          return true
        }
        return false
      },
    },
  }

  const gridApi = useRef()

  const [openNewModal, setOpenNewModal] = useState(false)
  const [selectedNewCompany, setSelectedNewCompany] = useState("")
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false)
  const [rowData, setRowData] = useState(data)
  const [newMaintenanceInfo, setNewMaintenanceInfo] = useState([])
  const [idToDelete, setIdToDelete] = useState("")

  const handleGridReady = (params) => {
    gridApi.current = params.api
  }

  const onFirstDataRendered = (params) => {
    params.columnApi.autoSizeColumns()
    params.api.redrawRows()
  }

  const handleGridExport = () => {
    if (gridApi.current) {
      const params = {
        allColumns: true,
        fileName: `maintenanceExport_${moment(new Date()).format("YYYYMMDD")}`,
        columnSeparator: ",",
      }
      gridApi.current.exportDataAsCsv(params)
    }
  }

  const handleToggleNewModal = () => {
    setOpenNewModal(!openNewModal)
    if (!openNewModal && newMaintenanceInfo.length === 0) {
      fetch("/api/companies?mail=true")
        .then((resp) => resp.json())
        .then((data) => {
          setNewMaintenanceInfo(data)
        })
    }
  }

  const handleNewCompanySelect = (selectedOption) => {
    setSelectedNewCompany(selectedOption)
  }

  const handleDelete = () => {
    fetch(`/api/maintenances?maintId=${idToDelete}`, {
      method: "DELETE",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id && data.active === false) {
          Notify("info", "Maintenance Deleted")
        } else {
          Notify("error", "Error Deleting Maintenance", data.err)
        }
      })
      .catch((err) => console.error(err))

    const newRowData = rowData.filter((el) => el.id !== idToDelete)
    setOpenConfirmDeleteModal(!openConfirmDeleteModal)
    setRowData(newRowData)
  }

  const handleDeleteMaintOpen = () => {
    if (gridApi) {
      const row = gridApi.current.getSelectedRows()
      if (row[0]) {
        const maintId = row[0].id
        setOpenConfirmDeleteModal(!openConfirmDeleteModal)
        setIdToDelete(maintId)
      } else {
        Notify("warning", "Please select a maintenance")
      }
    }
  }

  const toggleConfirmDelete = () => {
    setOpenConfirmDeleteModal(!openConfirmDeleteModal)
  }

  const handleSelectOpen = () => {}

  const createNewMaintenance = (newCompanyDomain) => {
    Router.push({
      pathname: "/maintenance",
      query: {
        id: "NEW",
        mailId: "NT",
        name: newCompanyDomain,
      },
      asPath: "/maintenance/new",
    })
  }

  const NewMaintenanceSelect = () => {
    return (
      <FlexboxGrid
        justify="center"
        align="middle"
        style={{ fontSize: "1.0rem", width: "200px" }}
      >
        <FlexboxGrid.Item>
          <label>Select a Company to create a Maintenance for</label>
          <br />
          <SelectPicker
            style={{ width: 325 }}
            value={selectedNewCompany || undefined}
            onChange={handleNewCompanySelect}
            onOpen={handleSelectOpen}
            onSearch={handleSelectOpen}
            data={newMaintenanceInfo}
            placeholder="Please select a Company"
            renderMenu={(menu) => {
              if (newMaintenanceInfo.length === 0) {
                return (
                  <div style={{ marginTop: "100px" }}>
                    <Loader center />
                  </div>
                )
              } else {
                return menu
              }
            }}
          />
        </FlexboxGrid.Item>
      </FlexboxGrid>
    )
  }

  if (session) {
    return (
      <Layout>
        <MaintPanel
          header="History"
          buttons={
            <ButtonGroup>
              <IconButton
                appearance="subtle"
                onClick={handleToggleNewModal}
                icon={
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="var(--grey4)"
                    style={{ marginRight: "5px" }}
                  >
                    <path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                style={{
                  padding: "0 20px",
                  color: "#595b5e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "Fira Sans",
                  fontWeight: "400",
                  fontSize: "14px",
                }}
              >
                New
              </IconButton>
              <IconButton
                appearance="subtle"
                onClick={handleDeleteMaintOpen}
                icon={
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="var(--grey4)"
                    style={{ marginRight: "5px" }}
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
                style={{
                  padding: "0 20px",
                  display: "flex",
                  alignItems: "center",
                  color: "#595b5e",
                  justifyContent: "space-between",
                  fontFamily: "Fira Sans",
                  fontWeight: "400",
                  fontSize: "14px",
                }}
              >
                Delete
              </IconButton>
              <IconButton
                appearance="subtle"
                onClick={handleGridExport}
                icon={
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="var(--grey4)"
                    style={{ marginRight: "5px" }}
                  >
                    <path d="M8 16a5 5 0 01-.916-9.916 5.002 5.002 0 019.832 0A5.002 5.002 0 0116 16m-7 3l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                }
                style={{
                  padding: "0 20px",
                  display: "flex",
                  color: "#595b5e",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "Fira Sans",
                  fontWeight: "400",
                  fontSize: "14px",
                }}
              >
                Export
              </IconButton>
            </ButtonGroup>
          }
        >
          <div
            className="ag-theme-material"
            style={{ height: "700px", width: "100%" }}
          >
            <AgGridReact
              gridOptions={gridOptions}
              rowData={rowData}
              onGridReady={handleGridReady}
              animateRows
              pagination
              onFirstDataRendered={onFirstDataRendered}
            />
          </div>
        </MaintPanel>
        {openConfirmDeleteModal && (
          <ConfirmModal
            header="Confirm Delete"
            content={`Are you sure you want to delete maintenance NT-${idToDelete}`}
            show={openConfirmDeleteModal}
            onHide={toggleConfirmDelete}
            cancelAction={toggleConfirmDelete}
            confirmAction={handleDelete}
          />
        )}
        {openNewModal && (
          <ConfirmModal
            header="New Maintenance"
            content={<NewMaintenanceSelect />}
            show={openNewModal}
            onHide={handleToggleNewModal}
            cancelAction={handleToggleNewModal}
            confirmAction={() => createNewMaintenance(selectedNewCompany)}
          />
        )}
      </Layout>
    )
  } else {
    return <RequireLogin />
  }
}

export async function getServerSideProps({ req }) {
  const host = req && (req.headers["x-forwarded-host"] ?? req.headers["host"])
  let protocol = "https:"
  if (host.indexOf("localhost") > -1) {
    protocol = "http:"
  }
  const pageRequest = `${protocol}//${host}/api/maintenances`
  const res = await fetch(pageRequest)
  const data = await res.json()
  return {
    props: {
      data,
      session: await getSession({ req }),
    },
  }
}

export default History
