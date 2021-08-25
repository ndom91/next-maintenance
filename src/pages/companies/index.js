import { useRef, useEffect, useState } from "react"
import { getSession } from "next-auth/client"
import { AgGridReact } from "ag-grid-react"
import moment from "moment-timezone"
import Layout from "@/newtelco/layout"
import MaintPanel from "@/newtelco/panel"
import RequireLogin from "@/newtelco/require-login"
import { IconButton, ButtonGroup, SelectPicker } from "rsuite"
import {
  EditBtn,
  MaintId,
  StartDateTime,
  EndDateTime,
  MailArrived,
  UpdatedAt,
  Supplier,
  RescheduledIcon,
  CompleteIcon,
  EdittedBy,
} from "@/newtelco/ag-grid"
import "./companies.css"
import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"

const Companies = ({ session, suppliers, company }) => {
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
        width: 100,
        pinned: "left",
        cellRenderer: "maintId",
        sort: "desc",
      },
      {
        headerName: "By",
        field: "bearbeitetvon",
        cellRenderer: "edittedby",
        width: 110,
        cellStyle: () => {
          return {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }
        },
      },
      {
        headerName: "Sender Maint ID",
        field: "sendermaintenanceid",
        tooltipField: "senderMaintenanceId",
      },
      // {
      //   headerName: "Their CID",
      //   field: "derencid",
      //   tooltipField: "derenCID",
      // },
      {
        headerName: "Start",
        field: "startdatetime",
        width: 160,
        cellRenderer: "startdatetime",
      },
      {
        headerName: "End",
        field: "enddatetime",
        width: 160,
        cellRenderer: "enddatetime",
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
        headerName: "Updated",
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
        width: 140,
        pinned: "right",
        cellRenderer: "complete",
      },
    ],
    context: { componentParent: this },
    frameworkComponents: {
      editBtn: EditBtn,
      startdatetime: StartDateTime,
      enddatetime: EndDateTime,
      mailArrived: MailArrived,
      updatedAt: UpdatedAt,
      maintId: MaintId,
      supplier: Supplier,
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
  const [rowData, setRowData] = useState([])
  const [selectedNewCompany, setSelectedNewCompany] = useState([])

  useEffect(() => {
    if (company) {
      const selectedCompany = suppliers.companies.find(
        (supplier) => supplier.label === company
      )
      handleNewCompanySelect(selectedCompany.value)
    }
  }, [company, suppliers])

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
        fileName: `company_${selectedNewCompany.label}_${moment(
          new Date()
        ).format("YYYYMMDD")}`,
        columnSeparator: ",",
      }
      gridApi.current.exportDataAsCsv(params)
    }
  }

  const handleNewCompanySelect = (selectedOption) => {
    setSelectedNewCompany(selectedOption)
    fetch(`/api/companies?maintId=${selectedOption}`)
      .then((resp) => resp.json())
      .then((data) => {
        setRowData(data)
      })
  }

  if (session) {
    return (
      <Layout>
        <MaintPanel
          header="Company History"
          buttons={
            <>
              <SelectPicker
                style={{ width: 325 }}
                value={selectedNewCompany}
                onChange={handleNewCompanySelect}
                data={suppliers}
                placeholder="Please select a Company"
              />
              <ButtonGroup>
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
                      stroke="currentColor"
                      style={{ marginRight: "5px" }}
                    >
                      <path d="M8 16a5 5 0 01-.916-9.916 5.002 5.002 0 019.832 0A5.002 5.002 0 0116 16m-7 3l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  }
                  style={{
                    padding: "0 20px",
                    display: "flex",
                    color: "var(--grey4)",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  Export
                </IconButton>
              </ButtonGroup>
            </>
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
      </Layout>
    )
  } else {
    return <RequireLogin />
  }
}

export async function getServerSideProps({ req, query }) {
  const host = req && (req.headers["x-forwarded-host"] ?? req.headers["host"])
  let protocol = "https:"
  if (host.indexOf("localhost") > -1) {
    protocol = "http:"
  }
  const res2 = await fetch(`${protocol}//${host}/api/companies?select=true`)
  const suppliers = await res2.json()
  return {
    props: {
      session: await getSession({ req }),
      company: query?.company || "",
      suppliers,
    },
  }
}

export default Companies
