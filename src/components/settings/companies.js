import { useRef, useEffect, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"
import Notify from "@/newtelco-utils/notification"
import ConfirmModal from "@/newtelco/confirmmodal"
import {
  Icon,
  Button,
  IconButton,
  ButtonGroup,
  FlexboxGrid,
  Panel,
  Input,
  Form,
  FormGroup,
  ControlLabel,
  HelpBlock,
  Modal,
  Loader,
} from "rsuite"

const Companies = () => {
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
        headerName: "Domain",
        field: "maildomain",
        width: 100,
      },
      {
        headerName: "Company",
        field: "name",
        width: 100,
        sort: { direction: "desc" },
      },
      {
        headerName: "Recipient",
        field: "maintenancerecipient",
      },
    ],
    rowSelection: "single",
    frameworkComponents: {
      customLoadingOverlay: Loader,
    },
    loadingOverlayComponent: "customLoadingOverlay",
  }

  const gridApi = useRef()
  const [rowData, setRowData] = useState([])
  const [newName, setNewName] = useState("")
  const [newDomain, setNewDomain] = useState("")
  const [newRecipient, setNewRecipient] = useState("")
  const [openCompanyModal, setOpenCompanyModal] = useState(false)
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState("")

  useEffect(() => {
    fetch("/api/companies")
      .then((resp) => resp.json())
      .then((data) => {
        setRowData(data)
        gridApi.current.hideOverlay()
      })
      .catch((err) => console.error(err))
  }, [])

  const handleGridReady = (params) => {
    gridApi.current = params.api
    gridApi.current.showLoadingOverlay()
    params.api.sizeColumnsToFit()
  }

  const toggleCompanyAdd = () => {
    setOpenCompanyModal(!openCompanyModal)
  }

  const handleDelete = () => {
    fetch(`/api/settings/companies?id=${companyToDelete.id}`, {
      method: "DELETE",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${companyToDelete.name} Deleted`)
        } else {
          Notify("warning", "Error", data.err)
        }
      })
      .catch((err) => console.error(err))

    const newRowData = rowData.filter((el) => el.id !== companyToDelete.id)
    setRowData(newRowData)
    setOpenConfirmDeleteModal(!openConfirmDeleteModal)
  }

  const toggleCompanyDeleteModal = () => {
    if (gridApi.current) {
      const row = gridApi.current.getSelectedRows()
      if (row[0]) {
        const companyId = row[0].id
        const companyName = row[0].name
        setOpenConfirmDeleteModal(!openConfirmDeleteModal)
        setCompanyToDelete({ id: companyId, name: companyName })
      } else {
        Notify("warning", "Please select a Company")
      }
    }
  }

  const handleAddCompany = () => {
    fetch(`/api/settings/companies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newName,
        domain: newDomain,
        recipient: newRecipient,
      }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${newName} Added`)
          const newRowData = rowData
          newRowData.push({
            id: data.id,
            mailDomain: newDomain,
            maintenanceRecipient: newRecipient,
            name: newName,
          })
          setRowData(newRowData)
          gridApi.current.setRowData(newRowData)
        } else {
          Notify("warning", "Error", data.err)
        }
        setOpenCompanyModal(!openCompanyModal)
      })
      .catch((err) => console.error(err))
  }

  const handleCellEdit = (params) => {
    const { id, name, mailDomain, maintenanceRecipient } = params.data

    fetch(`/api/settings/companies`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        name,
        domain: mailDomain,
        recipient: maintenanceRecipient,
      }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.id) {
          Notify("success", `${newName} Updated`)
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
            These are the companies you can select not only as the supplier, but
            also assign as customer to a CID later on.
          </p>
        </FlexboxGrid.Item>
        <FlexboxGrid.Item>
          <ButtonGroup>
            <IconButton
              onClick={toggleCompanyAdd}
              icon={<Icon icon="plus-circle" />}
              appearance="ghost"
              placement="right"
            >
              Add
            </IconButton>
            <IconButton
              onClick={toggleCompanyDeleteModal}
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
            rowData={rowData}
            onCellEditingStopped={handleCellEdit}
            animateRows
            stopEditingWhenGridLosesFocus
            immutableData
            getRowNodeId={(data) => {
              return data.id
            }}
          />
        </div>
      </Panel>
      {openCompanyModal && (
        <Modal
          backdrop
          show={openCompanyModal}
          size="xs"
          onHide={toggleCompanyAdd}
          className="add-modal-wrapper"
        >
          <Modal.Header>New Company</Modal.Header>
          <Modal.Body style={{ paddingBottom: "0px" }}>
            <FlexboxGrid
              justify="space-around"
              align="middle"
              style={{ flexDirection: "column", height: "350px" }}
            >
              <FlexboxGrid.Item
                style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}
              >
                <Form>
                  <FormGroup>
                    <ControlLabel>Name</ControlLabel>
                    <Input
                      key="input-name"
                      name="name"
                      type="text"
                      value={newName}
                      onChange={(value) => setNewName(value)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>Domain</ControlLabel>
                    <Input
                      key="input-domain"
                      name="domain"
                      type="text"
                      value={newDomain}
                      onChange={(value) => setNewDomain(value)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>
                      Recipients <small>(optional)</small>
                    </ControlLabel>
                    <Input
                      key="input-recipient"
                      name="recipients"
                      type="text"
                      value={newRecipient}
                      onChange={(value) => setNewRecipient(value)}
                    />
                    <HelpBlock style={{ fontSize: "0.8rem" }}>
                      Seperate multiple with semicolons
                    </HelpBlock>
                  </FormGroup>
                </Form>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item>
                <ButtonGroup block style={{ width: "20em" }}>
                  <Button
                    appearance="default"
                    onClick={toggleCompanyAdd}
                    style={{ width: "50%" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    onClick={handleAddCompany}
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
      {openConfirmDeleteModal && (
        <ConfirmModal
          header="Confirm Delete"
          content={`Are you sure you want to delete ${companyToDelete.name} (${companyToDelete.id})`}
          show={openConfirmDeleteModal}
          onHide={toggleCompanyDeleteModal}
          cancelAction={toggleCompanyDeleteModal}
          confirmAction={handleDelete}
        />
      )}
    </div>
  )
}

export default Companies
