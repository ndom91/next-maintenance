import { useState, useEffect, useRef } from "react"
import { AgGridReact } from "ag-grid-react"
import Select from "react-select"
import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"
import Notify from "@/newtelco-utils/notification"
import ConfirmModal from "@/newtelco/confirmmodal"
import {
  Panel,
  Button,
  ButtonGroup,
  IconButton,
  Icon,
  Form,
  FormGroup,
  Input,
  FlexboxGrid,
  Modal,
  ControlLabel,
  Loader,
} from "rsuite"

const SupplierCIDs = () => {
  const gridApi = useRef()
  const gridColumnApi = useRef()
  const [openSupplierCidAdd, setOpenSupplierCidAdd] = useState(false)
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false)
  const [rowData, setRowData] = useState([])
  const [companySelections, setCompanySelections] = useState([])
  const [newCompanySelection, setNewCompanySelection] = useState([])
  const [newSupplierCid, setNewSupplierCid] = useState("")
  const [supplierCidToDelete, setSupplierCidToDelete] = useState("")
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
        width: 60,
        editable: false,
      },
      {
        headerName: "Company",
        field: "company.name",
        width: 200,
        editable: false,
      },
      {
        headerName: "Supplier CID",
        field: "derencid",
        width: 200,
      },
    ],
    rowSelection: "single",
    frameworkComponents: {
      customLoadingOverlay: Loader,
    },
    loadingOverlayComponent: "customLoadingOverlay",
  }

  useEffect(() => {
    fetch("/api/settings/suppliercids")
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
    gridColumnApi.current = params.columnApi
    params.api.sizeColumnsToFit()
  }

  const toggleSupplierCidAdd = () => {
    setOpenSupplierCidAdd(!openSupplierCidAdd)
  }

  const handleCompanyChange = (selectedOption) => {
    setNewCompanySelection({
      value: selectedOption.value,
      label: selectedOption.label,
    })
  }

  const handleDelete = () => {
    fetch(`/api/settings/suppliercids?id=${supplierCidToDelete.id}`, {
      method: "DELETE",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${supplierCidToDelete.name} Deleted`)
        } else {
          Notify("warning", "Error", data.err)
        }
      })
      .catch((err) => console.error(err))

    const newRowData = rowData.filter((el) => el.id !== supplierCidToDelete.id)
    setRowData(newRowData)
    setOpenConfirmDeleteModal(!openConfirmDeleteModal)
  }

  const toggleSupplierCidDeleteModal = () => {
    if (gridApi.current) {
      const row = gridApi.current.getSelectedRows()
      if (row[0]) {
        const supplierCidId = row[0].id
        const supplierCid = row[0].derencid
        setOpenConfirmDeleteModal(!openConfirmDeleteModal)
        setSupplierCidToDelete({ id: supplierCidId, name: supplierCid })
      } else {
        Notify("warning", "Please select a Supplier CID")
      }
    }
  }

  const handleAddSupplierCid = () => {
    fetch(`/api/settings/suppliercids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cid: newSupplierCid,
        company: newCompanySelection.value,
      }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${newSupplierCid} Added`)
        } else {
          Notify("warning", "Error", data.err)
        }
        const newRowData = rowData
        newRowData.push({
          id: data.id,
          derencid: newSupplierCid,
          company: {
            name: newCompanySelection.label,
          },
        })
        setRowData(newRowData)
        setOpenSupplierCidAdd(!openSupplierCidAdd)
        gridApi.current.setRowData(newRowData)
      })
      .catch((err) => console.error(err))
  }

  const handleCellEdit = (params) => {
    const { id } = params.data
    const newSupplierCid = params.data.derencid

    fetch(`/api/settings/suppliercids`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: id,
        suppliercid: newSupplierCid,
      }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${newSupplierCid} Updated`)
        } else {
          Notify("warning", "Error", data.err)
        }
      })
      .catch((err) => console.error(err))
  }

  const Header = () => {
    return (
      <FlexboxGrid
        justify="space-between"
        align="middle"
        style={{ marginBottom: "20px" }}
      >
        <FlexboxGrid.Item>
          <p style={{ fontFamily: "var(--font-body)", fontWeight: 100 }}>
            These are the CIDs which must be assigned to a company and can be
            chosen from the dropdown in the edit form.
          </p>
        </FlexboxGrid.Item>
        <FlexboxGrid.Item>
          <ButtonGroup>
            <IconButton
              onClick={toggleSupplierCidAdd}
              icon={<Icon icon="plus-circle" />}
              appearance="ghost"
              placement="right"
            >
              Add
            </IconButton>
            <IconButton
              onClick={toggleSupplierCidDeleteModal}
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
        <div className="table-wrapper">
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
        </div>
      </Panel>
      {openConfirmDeleteModal && (
        <ConfirmModal
          show={openConfirmDeleteModal}
          onHide={toggleSupplierCidDeleteModal}
          header="Confirm Delete"
          content={`Are you sure you want to delete ${supplierCidToDelete.name} (${supplierCidToDelete.id})`}
          cancelAction={toggleSupplierCidDeleteModal}
          confirmAction={handleDelete}
        />
      )}
      {openSupplierCidAdd && (
        <Modal
          backdrop
          show={openSupplierCidAdd}
          size="xs"
          onHide={toggleSupplierCidAdd}
          className="add-supplier-modal"
        >
          <Modal.Header>New Supplier CID</Modal.Header>
          <Modal.Body style={{ overflow: "visible", paddingBottom: "0px" }}>
            <FlexboxGrid
              justify="space-around"
              align="middle"
              style={{ flexDirection: "column", height: "250px" }}
            >
              <FlexboxGrid.Item
                style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}
              >
                <Form>
                  <FormGroup>
                    <ControlLabel>Supplier</ControlLabel>
                    <Select
                      value={newCompanySelection}
                      className="company-select"
                      onChange={handleCompanyChange}
                      options={companySelections}
                      noOptionsMessage={() => "No Companies Available"}
                      placeholder="Company"
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>Supplier CID</ControlLabel>
                    <Input
                      id="updated-by"
                      name="updated-by"
                      type="text"
                      value={newSupplierCid}
                      onChange={(value) => setNewSupplierCid(value)}
                    />
                  </FormGroup>
                </Form>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item>
                <ButtonGroup block style={{ width: "20em" }}>
                  <Button
                    appearance="default"
                    onClick={toggleSupplierCidAdd}
                    style={{ width: "50%" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    onClick={handleAddSupplierCid}
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

SupplierCIDs.getInitialProps = async ({ req }) => {
  const host = req && (req.headers["x-forwarded-host"] ?? req.headers["host"])
  let protocol = "https:"
  if (host.indexOf("localhost") > -1) {
    protocol = "http:"
  }
  const pageRequest = `${protocol}//${host}/api/settings/lieferantcids`
  const res = await fetch(pageRequest)
  const json = await res.json()
  return {
    jsonData: json,
  }
}

export default SupplierCIDs
