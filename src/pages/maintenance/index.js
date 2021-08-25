import { useCallback, useState, useEffect, useRef } from "react"
import { getSession } from "next-auth/client"
import Head from "next/head"
import dynamic from "next/dynamic"
import Router, { useRouter } from "next/router"

import Layout from "@/newtelco/layout"
import useStore from "@/newtelco/store"
import MaintPanel from "@/newtelco/panel"
import RequireLogin from "@/newtelco/require-login"
import ConfirmModal from "@/newtelco/confirmmodal"
import { ProtectedIcon, SentIcon, CustomerCid } from "@/newtelco/ag-grid"

import tzOptions from "@/newtelco/maintenance/timezoneOptions"
import MailEditor from "@/newtelco/maintenance/mailEditor"
import CommentList from "@/newtelco/maintenance/comments/list"
import RescheduleGrid from "@/newtelco/maintenance/reschedule"
import { getUnique, convertDateTime } from "@/newtelco/maintenance/helper"

import Notify from "@/newtelco-utils/notification"
import objDiff from "@/newtelco-utils/objdiff"

import Select from "react-select"
import moment from "moment-timezone"
import debounce from "just-debounce-it"
import Flatpickr from "react-flatpickr"
import { AgGridReact } from "ag-grid-react"
import { Formik, FastField, Field, useFormikContext } from "formik"
import { format, isValid, formatDistance, parseISO } from "date-fns"

import "ag-grid-community/dist/styles/ag-grid.css"
import "ag-grid-community/dist/styles/ag-theme-material.css"
import "flatpickr/dist/themes/airbnb.css"
import "./maintenance.css"

import {
  Icon,
  FormGroup,
  Input,
  ControlLabel,
  HelpBlock,
  Button,
  Whisper,
  Tooltip,
  Panel,
  IconButton,
  ButtonGroup,
  FlexboxGrid,
  Toggle,
  Grid,
  Row,
  Col,
  Loader,
  Progress,
  Container,
  Message,
  SelectPicker,
  TagPicker,
  Nav,
  InputGroup,
} from "rsuite"

const Changelog = dynamic(() => import("@/newtelco/maintenance/timeline"), {
  ssr: false,
})
const ReadModal = dynamic(() => import("@/newtelco/maintenance/readmodal"), {
  ssr: false,
})

const MyTextarea = ({ field, form, ...props }) => {
  return (
    <Input
      rows={3}
      type="text"
      key={field.name}
      componentClass="textarea"
      name={field.name}
      disabled={props.maintId === "NEW"}
      value={field.value || ""}
      onChange={(option) => form.setFieldValue(field.name, option)}
    />
  )
}

const MyTextinput = ({ field, form, placeholder = "", ...props }) => {
  return (
    <Input
      name={field.name}
      value={field.value || ""}
      disabled={props.maintId === "NEW"}
      placeholder={placeholder}
      className="maintenance--input"
      onChange={(option) => form.setFieldValue(field.name, option)}
    />
  )
}

const MyDateTime = ({ field, form, ...props }) => {
  return (
    <Flatpickr
      name={field.name}
      value={field.value}
      disabled={props.maintId === "NEW"}
      data-enable-time
      onChange={(option) => {
        const rawValue = moment(option[0])
          .format("YYYY-MM-DD HH:mm:ss")
          .toString()
        form.setFieldValue(field.name, rawValue)
        let startDateTime = new Date(form.values.startDateTime).toISOString()
        let endDateTime = new Date(form.values.endDateTime).toISOString()
        if (field.name === "startDateTime") {
          startDateTime = new Date(option[0]).toISOString()
        } else if (field.name === "endDateTime") {
          endDateTime = new Date(option[0]).toISOString()
        }
        if (
          startDateTime &&
          endDateTime &&
          isValid(parseISO(startDateTime)) &&
          isValid(parseISO(endDateTime))
        ) {
          const impactCalculation = formatDistance(
            parseISO(endDateTime),
            parseISO(startDateTime)
          )
          props.setImpactPlaceholder(impactCalculation)
        }
      }}
      options={{
        time_24hr: "true",
        allowInput: "true",
      }}
      className="flatpickr"
      render={({ defaultValue, ...props }, ref) => {
        const curTimezone = tzOptions.filter(
          (opt) => opt.value === form.values.timezone
        )
        let tzDisplay = ""
        if (curTimezone[0]) {
          const regex = /(GMT(-|\+)?([0-1][0-9]:[0-5][0-9])?)/i
          tzDisplay = curTimezone[0].label.match(regex)[0]
        }
        return (
          <InputGroup>
            <Input defaultValue={defaultValue} inputRef={ref} {...props} />
            <InputGroup.Addon style={{ color: "#b9b9b9" }}>
              {tzDisplay}
            </InputGroup.Addon>
          </InputGroup>
        )
      }}
    />
  )
}

const MyTagPicker = ({ field, form, ...props }) => {
  return (
    <TagPicker
      name={field.name}
      value={field.value}
      onChange={(option) => {
        form.setFieldValue(field.name, option)
        if (!option && props.customerCids.length) {
          props.setCustomerCids([])
        }
      }}
      onClose={() => {
        if (field.value?.length) {
          props.fetchCustomerCids(field.value)
        } else {
          props.setCustomerCids([])
        }
      }}
      onClean={() => {
        props.setCustomerCids([])
      }}
      data={props.supplierCids}
      block
      cleanable
      placeholder="Please select a CID"
      disabled={props.maintId === "NEW"}
    />
  )
}

const AutoSave = ({ debounceMs, id }) => {
  const formik = useFormikContext()
  const [lastSaved, setLastSaved] = useState(null)
  const debouncedSubmit = useCallback(
    debounce(
      () =>
        formik
          .submitForm()
          .then(() => setLastSaved(new Date().toLocaleString("de-DE"))),
      debounceMs
    ),
    [debounceMs, formik.submitForm]
  )

  useEffect(() => {
    if (id !== "NEW") {
      debouncedSubmit()
    }
  }, [debouncedSubmit, formik.values])

  let result = null

  if (formik.isSubmitting) {
    result = "Saving..."
  } else if (Object.keys(formik.errors).length > 0) {
    result = `Error: ${formik.errors.error}`
  } else if (lastSaved !== null) {
    result = lastSaved
  }
  return (
    <div
      style={{ color: "var(--grey2)", display: "flex", alignItems: "center" }}
    >
      <Whisper placement="top" speaker={<Tooltip>Last Saved</Tooltip>}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--grey2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span style={{ marginLeft: "5px" }}>{convertDateTime(result)}</span>
        </div>
      </Whisper>
    </div>
  )
}

const Maintenance = ({ session, serverData, suppliers }) => {
  const rescheduleData = useStore((state) => state.rescheduleData)

  const [maintenance, setMaintenance] = useState({
    ...serverData,
    name: serverData.suppliercompany?.name ?? "",
    maildomain: serverData.suppliercompany?.maildomain ?? "",
  })
  const [frozenCompany, setFrozenCompany] = useState("")
  const [openReadModal, setOpenReadModal] = useState(false)
  const [openPreviewModal, setOpenPreviewModal] = useState(false)
  const [openConfirmFreezeModal, setOpenConfirmFreezeModal] = useState(false)
  const [mailBodyText, setMailBodyText] = useState("")
  const [mailPreviewRecipients, setMailPreviewRecipients] = useState("")
  const [mailPreviewCustomerCID, setMailPreviewCustomerCid] = useState("")
  const [mailPreviewSubject, setMailPreviewSubject] = useState("")
  const [customerCids, setCustomerCids] = useState([])
  const [supplierCids, setSupplierCids] = useState([])
  const [impactPlaceholder, setImpactPlaceholder] = useState([])
  const [sentProgress, setSentProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("customer")
  const [maintHistory, setMaintHistory] = useState({
    timezone: serverData?.timezone || null,
    supplier: serverData?.supplierid,
    sendermaintenanceid: serverData?.sendermaintenanceid,
    startdatetime: serverData?.startdatetime,
    enddatetime: serverData?.enddatetime,
    suppliercids: serverData?.derencidid,
    impact: serverData?.impact,
    location: serverData?.location,
    reason: serverData?.reason,
    maintnote: serverData?.maintnote,
    cancelled: !!+serverData?.cancelled,
    emergency: !!+serverData?.emergency,
    done: !!+serverData?.done,
  })
  const [frozenState, setFrozenState] = useState({
    recipient: "",
    cid: "",
  })

  const formRef = useRef()
  const gridApi = useRef()
  const gridColumnApi = useRef()

  const router = useRouter()

  const sendMailBtns = ({
    data: {
      maintenancerecipient,
      kundencid,
      frozen,
      name,
      protected: protection,
    },
  }) => {
    return (
      <ButtonGroup>
        <Whisper placement="bottom" speaker={<Tooltip>Direct Send</Tooltip>}>
          <IconButton
            onClick={() =>
              prepareDirectSend(maintenancerecipient, kundencid, frozen, name)
            }
            size="sm"
            appearance="ghost"
            icon={<Icon icon="send" />}
          />
        </Whisper>
        <Whisper placement="bottom" speaker={<Tooltip>Preview Mail</Tooltip>}>
          <IconButton
            onClick={() =>
              togglePreviewModal(maintenancerecipient, kundencid, protection)
            }
            size="sm"
            appearance="ghost"
            icon={<Icon icon="search" />}
          />
        </Whisper>
      </ButtonGroup>
    )
  }

  const togglePreviewModal = (recipient, customerCID, protection) => {
    if (recipient && customerCID) {
      const HtmlBody = generateMail(customerCID, protection)
      if (HtmlBody) {
        setMailBodyText(HtmlBody)
        setMailPreviewRecipients(recipient || mailPreviewRecipients)
        setMailPreviewCustomerCid(customerCID)
        generateMailSubject()
        setOpenPreviewModal(!openPreviewModal)
      }
    } else {
      generateMailSubject()
      setOpenPreviewModal(!openPreviewModal)
    }
  }

  const gridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },
    columnDefs: [
      {
        headerName: "CID",
        field: "kundencid",
        width: 100,
        sort: { direction: "asc", priority: 0 },
        cellRenderer: "customerCid",
      },
      {
        headerName: "Customer",
        field: "name",
        width: 170,
      },
      {
        headerName: "Protection",
        field: "protected",
        filter: false,
        cellRenderer: "protectedIcon",
        width: 120,
        cellStyle: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        },
      },
      {
        headerName: "Recipient",
        field: "maintenancerecipient",
        width: 150,
      },
      {
        headerName: "Sent",
        field: "sent",
        cellRenderer: "sentIcon",
        width: 100,
        pinned: "right",
        cellStyle: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        },
      },
      {
        headerName: "Mail",
        width: 80,
        sortable: false,
        filter: false,
        resizable: false,
        pinned: "right",
        cellRenderer: "sendMailBtn",
        cellStyle: { "padding-right": "0px", "padding-left": "10px" },
      },
    ],
    loadingOverlayComponent: "customLoadingOverlay",
    frameworkComponents: {
      sendMailBtn: sendMailBtns,
      protectedIcon: ProtectedIcon,
      sentIcon: SentIcon,
      customLoadingOverlay: Loader,
      customerCid: CustomerCid,
    },
    paginationPageSize: 10,
    rowClass: "row-class",
    rowClassRules: {
      "row-frozen": function (params) {
        if (params.data.frozen) {
          return true
        }
        return false
      },
    },
  }

  useEffect(() => {
    if (serverData.id === "NEW") {
      // prepare NEW maintenance
      const username = session.user.email.substr(
        0,
        session.user.email.indexOf("@")
      )
      fetch(`/api/companies?domain=${serverData.name}`)
        .then((resp) => resp.json())
        .then((data) => {
          if (!data[0]) {
            fetchSupplierCids()
            return
          }
          const companyId = data[0].id
          const companyName = data[0].name
          setMaintenance({
            ...serverData,
            name: companyName,
            lieferant: companyId,
            bearbeitetvon: username,
            updatedAt: format(new Date(), "MM.dd.yyyy HH:mm"),
          })
          fetchSupplierCids(companyId)
          formRef.current.setFieldValue("supplier", companyId)
          gridApi.current.hideOverlay()
        })
        .catch((err) => console.error(`Error - ${err}`))
    } else {
      // prepare page for existing maintenance
      const { cancelled, emergency, done } = serverData

      setMaintenance({
        ...serverData,
        name: serverData.suppliercompany.name,
        maildomain: serverData.suppliercompany.maildomain,
        cancelled: !!+cancelled,
        emergency: !!+emergency,
        done: !!+done,
      })
      fetchSupplierCids(serverData.lieferant)

      const startDateTime = serverData.startdatetime
      const endDateTime = serverData.enddatetime
      if (
        startDateTime &&
        endDateTime &&
        isValid(parseISO(startDateTime)) &&
        isValid(parseISO(endDateTime))
      ) {
        const impactCalculation = formatDistance(
          parseISO(endDateTime),
          parseISO(startDateTime)
        )
        setImpactPlaceholder(impactCalculation)
      }
    }
  }, [serverData])

  /// /////////////////////////////////////////////////////////
  //
  //                AG-GRID TABLE
  //
  /// /////////////////////////////////////////////////////////

  const handleGridReady = (params) => {
    gridApi.current = params.api
    if (customerCids.length === 0) {
      gridApi.current.showLoadingOverlay()
    }
    gridColumnApi.current = params.gridColumnApi
  }

  /// /////////////////////////////////////////////////////////
  //
  //                ACTIONS: API CALLS
  //
  /// /////////////////////////////////////////////////////////

  // fetch supplier CIDs
  const fetchSupplierCids = (lieferantId) => {
    if (!lieferantId) {
      setSupplierCids([{ label: "Invalid Supplier ID", value: "1" }])
      return
    }
    fetch(`/api/lieferantcids?id=${lieferantId}`)
      .then((resp) => resp.json())
      .then((data) => {
        if (!data.lieferantCIDsResult) {
          setSupplierCids([
            { label: "No CIDs available for this Supplier", value: "1" },
          ])
          return
        }
        setSupplierCids(data.lieferantCIDsResult)
      })
      .catch((err) => console.error(`Error - ${err}`))
  }

  // fetch customer CIDs based on selected Supplier CID
  const fetchCustomerCids = (lieferantCidId) => {
    if (!lieferantCidId) {
      gridApi.current.hideOverlay()
      return
    }
    fetch("/api/settings/customercids", {
      method: "POST",
      body: JSON.stringify({
        cids: lieferantCidId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        gridApi.current.showLoadingOverlay()
        let currentSentStatus = 0
        if (maintenance.done) {
          currentSentStatus = 1
        }
        const newKundenCids = []
        data.forEach((cid) => {
          cid.kundencid.forEach((kundenCircuit) => {
            newKundenCids.push({
              maildomain: kundenCircuit.kundecompany.maildomain,
              maintenancerecipient:
                kundenCircuit.kundecompany.maintenancerecipient,
              name: kundenCircuit.kundecompany.name,
              kundencid: kundenCircuit.kundencid,
              companyid: kundenCircuit.companyid,
              protected: !!+kundenCircuit.protected,
              sent: currentSentStatus,
              frozen: false,
            })
          })
        })
        const uniqueKundenCids = getUnique(newKundenCids, "kundencid")
        setCustomerCids(uniqueKundenCids)
        gridApi.current.hideOverlay()
        uniqueKundenCids.length && checkFreezeStatus(uniqueKundenCids)
      })
      .catch((err) => console.error(`Error - ${err}`))
  }

  const checkFreezeStatus = (cids) => {
    const uniqueCustomers = []
    cids.forEach((cid) => {
      if (!cid.companyid) return
      uniqueCustomers.push(cid.companyid)
    })
    if ([...new Set(uniqueCustomers)].length) {
      fetch("/api/maintenances/freeze", {
        method: "POST",
        body: JSON.stringify({
          companys: [...new Set(uniqueCustomers)],
          startdate: moment
            .tz(maintenance.startdatetime, maintenance.timezone)
            .format(),
          enddate: moment
            .tz(maintenance.enddatetime, maintenance.timezone)
            .format(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.length !== 0) {
            const customerCidEntries = customerCids
            data.forEach((freezeResult) => {
              const frozenCidIndex = customerCidEntries.findIndex(
                (el) => el.kunde === freezeResult.companyid
              )
              Notify(
                "error",
                "Network Freeze",
                `${freezeResult.company.name} has active freeze during this time period!`
              )
              customerCidEntries[frozenCidIndex].frozen = true
            })
            setCustomerCids(customerCidEntries)
            if (gridApi.current) {
              gridApi.current.refreshCells()
            }
          }
        })
        .catch((err) => console.error(`Error - ${err}`))
    }
  }

  /// /////////////////////////////////////////////////////////
  //                    SEND MAILS
  /// /////////////////////////////////////////////////////////

  // prepare mail from direct-send button
  const prepareDirectSend = (recipient, customerCID, frozen, companyName) => {
    if (frozen) {
      setFrozenState({
        recipient: recipient,
        cid: customerCID,
      })
      setFrozenCompany(companyName)
      toggleConfirmFreezeModal()
      return
    }
    const HtmlBody = generateMail(customerCID)
    const subject = generateMailSubject()
    sendMail(recipient, customerCID, subject, HtmlBody, false, false)
  }

  // generate Mail contents
  const generateMail = (customerCID, protection) => {
    // TODO: everything that can be changed by form = currentMaint, everythign else =hook maintenance
    const currentMaint = formRef.current.values

    if (!currentMaint.startDateTime || !currentMaint.endDateTime) {
      Notify("warning", "Missing Required Fields")
      return
    }

    const timezoneValue = currentMaint.timezone || "Europe/Dublin"
    const rawStart = moment.tz(
      moment(currentMaint.startDateTime).format("YYYY-MM-DD HH:mm:ss"),
      timezoneValue
    )
    const rawEnd = moment.tz(
      moment(currentMaint.endDateTime).format("YYYY-MM-DD HH:mm:ss"),
      timezoneValue
    )
    const utcStart1 = rawStart.tz("GMT").format("YYYY-MM-DD HH:mm:ss")
    const utcEnd1 = rawEnd.tz("GMT").format("YYYY-MM-DD HH:mm:ss")
    const utcStart = utcStart1 || serverData.startdatetime
    const utcEnd = utcEnd1 || serverData.enddatetime

    let maintenanceIntro =
      "We would like to inform you about planned work on the following CID(s):"
    const rescheduleText = ""
    const tzSuffixRAW = "UTC / GMT+0:00"

    const cancelled = !!+currentMaint.cancelled
    if (cancelled) {
      maintenanceIntro = `We would like to inform you that these planned works (<b>NT-${maintenance.id}</b>) have been <b>cancelled</b> with the following CID(s):`
    }

    const emergency = !!+currentMaint.emergency
    if (emergency) {
      maintenanceIntro = `We would like to inform you that these planned works (<b>NT-${maintenance.id}</b>) have been labelled as <b>emergency</b> works on the following CID(s):`
    }

    if (rescheduleData.length) {
      const latest = rescheduleData.length - 1
      const newStart = moment(rescheduleData[latest].startDateTime).format(
        "YYYY-MM-DD HH:mm:ss"
      )
      const newEnd = moment(rescheduleData[latest].endDateTime).format(
        "YYYY-MM-DD HH:mm:ss"
      )
      const newImpact = rescheduleData[latest].impact
      const newReason = rescheduleData[latest].reason.toLowerCase()
      const rcounter = rescheduleData[latest].rcounter
      if (cancelled && rescheduleData[latest]) {
        maintenanceIntro = `We would like to inform you that these rescheduled planned works (<b>NT-${maintenance.id}-${rcounter}</b>) have been <b>cancelled</b>.<br><br>We are sorry for any inconveniences this may have caused.<br><footer>​<style>.sig{font-family:Century Gothic, sans-serif;font-size:9pt;color:#636266!important;}b.i{color:#4ca702;}.gray{color:#636266 !important;}a{text-decoration:none;color:#636266 !important;}</style><div class="sig"><div>Best regards <b class="i">|</b> Mit freundlichen Grüßen</div><br><div><b>Newtelco Maintenance Team</b></div><br><div>NewTelco GmbH <b class="i">|</b> Moenchhofsstr. 24 <b class="i">|</b> 60326 Frankfurt a.M. <b class="i">|</b> DE <br>www.newtelco.com <b class="i">|</b> 24/7 NOC  49 69 75 00 27 30 ​​<b class="i">|</b> <a style="color:#" href="mailto:service@newtelco.de">service@newtelco.de</a><br><br><div><img alt="sig" src="https://home.newtelco.de/sig.png" height="29" width="516"></div></div>​</footer><hr />`
      }
      maintenanceIntro = `We regret to inform you that the planned works have been <b>rescheduled</b> on the following CID(s):\n\n<br><br><b>${customerCID}</b><br><br>The maintenance has been rescheduled due to ${newReason}.<br><br>The new details are as follows:<br><table border="0" cellspacing="2" cellpadding="2" width="775px"><tr><td style='width: 205px;'>Maintenance ID:</td><td><b>NT-${maintenance.id}-${rcounter}</b></td></tr><tr><td>New Start date and time:</td><td><b>${newStart} (${tzSuffixRAW})</b></td></tr><tr><td>New Finish date and time:</td><td><b>${newEnd} (${tzSuffixRAW})</b></td></tr><tr><td>New Impact:</td><td><b>${newImpact}</b></td></tr></table><br>Thank you very much for your patience and cooperation.<br>`

      if (rescheduleData.length > 1) {
        maintenanceIntro += "<br><hr><br><b>Previous Reschedules:</b><br>"
        const oldReschedules = rescheduleData
        oldReschedules.pop()
        let index = oldReschedules.length
        const reversedReschedules = {
          next: function () {
            index--
            return {
              done: index < 0,
              value: oldReschedules[index],
            }
          },
        }
        reversedReschedules[Symbol.iterator] = function () {
          return this
        }
        for (const i of reversedReschedules) {
          const newStart = moment(i.startDateTime).format("YYYY-MM-DD HH:mm:ss")
          const newEnd = moment(i.endDateTime).format("YYYY-MM-DD HH:mm:ss")
          const newImpact = i.impact
          const newReason = i.reason && i.reason.toLowerCase()
          const rcounter = i.rcounter
          maintenanceIntro += `<br>This maintenance had been rescheduled due to ${newReason}.<br><br>The previous details were as follows:<br><table border="0" cellspacing="2" cellpadding="2" width="775px"><tr><td style='width: 205px;'>Maintenance ID:</td><td><b>NT-${maintenance.id}-${rcounter}</b></td></tr><tr><td>Previous Start date and time:</td><td><b>${newStart} (${tzSuffixRAW})</b></td></tr><tr><td>Previous Finish date and time:</td><td><b>${newEnd} (${tzSuffixRAW})</b></td></tr><tr><td>Previous Impact:</td><td><b>${newImpact}</b></td></tr></table>`
        }
      }
      maintenanceIntro +=
        "<br><hr><i><b>Original Planned Works:</b></i><br><br>Dear Colleagues,<br><br>We would like to inform you about planned work on the following CID(s):\n"
    }

    let body = `<body style="color:#666666;">${rescheduleText} Dear Colleagues,​​<p><span>${maintenanceIntro}<br><br> <b>${customerCID}</b> <br><br>The maintenance work is with the following details:</span></p><table border="0" cellspacing="2" cellpadding="2" width="775px"><tr><td style='width: 205px;'>Maintenance ID:</td><td><b>NT-${maintenance.id}</b></td></tr><tr><td>Start date and time:</td><td><b>${utcStart} (${tzSuffixRAW})</b></td></tr><tr><td>Finish date and time:</td><td><b>${utcEnd} (${tzSuffixRAW})</b></td></tr>`
    if (currentMaint.impact || protection || impactPlaceholder) {
      if (protection) {
        body = body + "<tr><td>Impact:</td><td>50ms Protection Switch</td></tr>"
      } else {
        const impactText = currentMaint.impact || impactPlaceholder
        body = body + "<tr><td>Impact:</td><td>" + impactText + "</td></tr>"
      }
    }

    if (currentMaint.location) {
      body =
        body +
        "<tr><td>Location:</td><td>" +
        currentMaint.location +
        "</td></tr>"
    }

    if (currentMaint.reason) {
      body =
        body + "<tr><td>Reason:</td><td>" + currentMaint.reason + "</td></tr>"
    }

    const maintNoteBody = currentMaint.maintNote
      ? `<p>${currentMaint.maintNote}</p>`
      : ""

    body =
      body +
      `</table>${maintNoteBody}<p>We sincerely regret any inconvenience that may be caused by this and hope for further mutually advantageous cooperation.</p><p>If you have any questions feel free to contact us at maintenance@newtelco.de.</p></div>​​</body>​​<footer>​<style>.sig{font-family:Century Gothic, sans-serif;font-size:9pt;color:#636266!important;}b.i{color:#4ca702;}.gray{color:#636266 !important;}a{text-decoration:none;color:#636266 !important;}</style><div class="sig"><div>Best regards <b class="i">|</b> Mit freundlichen Grüßen</div><br><div><b>Newtelco Maintenance Team</b></div><br><div>NewTelco GmbH <b class="i">|</b> Moenchhofsstr. 24 <b class="i">|</b> 60326 Frankfurt a.M. <b class="i">|</b> DE <br>www.newtelco.com <b class="i">|</b> 24/7 NOC  49 69 75 00 27 30 ​​<b class="i">|</b> <a style="color:#" href="mailto:service@newtelco.de">service@newtelco.de</a><br><br><div><img alt="sig" src="https://home.newtelco.de/sig.png" height="29" width="516"></div></div>​</footer>`

    return body
  }

  // send out the created mail
  const sendMail = async (
    recipient,
    customerCid,
    subj,
    htmlBody,
    isFromPreview,
    isFromSendAll
  ) => {
    const activeRowIndex = customerCids.findIndex(
      (el) => el.kundencid === customerCid
    )
    const kundenCidRow = customerCids[activeRowIndex]
    if (kundenCidRow && kundenCidRow.frozen) {
      setFrozenCompany(kundenCidRow.name || "")
      setFrozenState({
        recipient: recipient,
        cid: customerCid,
      })
      toggleConfirmFreezeModal()
      return
    }
    const body = htmlBody ?? mailBodyText
    let subject = subj ?? mailPreviewSubject
    const to = recipient ?? mailPreviewRecipients

    await fetch("/v1/api/mail/send", {
      method: "post",
      body: JSON.stringify({
        body,
        subject,
        to,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        const { status, statusText } = data.response

        if (status === 200 && statusText === "OK") {
          updateSentProgress()
          if (!isFromSendAll) {
            Notify("success", "Mail Sent")
          }
          const activeCustomer = customerCids.find(
            (el) => el.kundencid === customerCid
          )
          if (activeCustomer) {
            if (maintenance.cancelled === true && maintenance.done === true) {
              activeCustomer.sent = 2
            } else {
              activeCustomer.sent = 1
            }
            const updatedKundenCids = [...customerCids, activeCustomer]
            const deduplicatedKundenCids = getUnique(
              updatedKundenCids,
              "kundencid"
            )
            setCustomerCids(deduplicatedKundenCids)
            if (isFromPreview) {
              setOpenPreviewModal(!openPreviewModal)
            }
            gridApi?.current?.refreshCells()
            const maintId = maintenance.id
            const user = session.user.email
            const action = "sent to"
            const field = activeCustomer.name
            fetch(`/api/changelog`, {
              method: "POST",
              body: JSON.stringify({
                maintId,
                user,
                field,
                action,
              }),
            }).catch((err) =>
              console.error(`Error updating Audit Log - ${err}`)
            )
          }
        } else {
          Notify("error", "Error Sending Mail")
          if (isFromPreview) {
            setOpenPreviewModal(!openPreviewModal)
          }
        }
      })
      .catch((err) => console.error(`Error - ${err}`))
  }

  const handleSendAll = () => {
    const rowCount = gridApi.current.getDisplayedRowCount() - 1
    gridApi.current.forEachNode((node, index) => {
      setTimeout(() => {
        const HtmlBody = generateMail(node.data.kundenCID, node.data.protected)
        const subject = generateMailSubject()
        sendMail(
          node.data.maintenanceRecipient,
          node.data.kundenCID,
          subject,
          HtmlBody,
          false,
          true
        )
        Notify("success", `Mail Sent - ${node.data.name}`)
        if (index === rowCount) {
          Notify("success", "All Mails Sent!")
        }
      }, 500 * (index + 1))
    })
  }

  const updateSentProgress = () => {
    if (customerCids.length) {
      let progressSent = 0
      customerCids.forEach((cid) => {
        if (cid.sent === 1 || cid.sent === 2) {
          progressSent += 1
        }
      })
      setSentProgress((progressSent / customerCids.length) * 100)
    }
  }

  const handleCalendarCreate = () => {
    const currentMaint = formRef.current.values
    const { name: company, id: maintId } = maintenance
    const { startDateTime, endDateTime } = currentMaint

    const derenCidString = currentMaint.supplierCids?.map((supplierCidId) => {
      const supplierCid = supplierCids.find(
        (supplier) => supplier.value === supplierCidId
      )
      return supplierCid?.label ?? ""
    })

    let cids = ""
    customerCids.forEach((cid) => {
      cids += ` ${cid.kundencid}`
    })
    cids = cids.trim()

    const startMoment = moment.tz(startDateTime, currentMaint.timezone)
    const startDE = startMoment.tz("Europe/Berlin").format()
    const endMoment = moment.tz(endDateTime, currentMaint.timezone)
    const endDE = endMoment.tz("Europe/Berlin").format()

    fetch("/v1/api/calendar/create", {
      method: "post",
      body: JSON.stringify({
        company,
        cids,
        maintId,
        startDateTime: startDE,
        endDateTime: endDE,
        user: session.user.email,
        supplierCID: derenCidString.join(" ").trim(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        const { status, statusText } = data

        if (status === 200 && statusText === "OK") {
          Notify("success", "Calendar Entry Created")
          const calId = data.event.data.id

          setMaintenance({
            ...maintenance,
            ...currentMaint,
            calendarId: calId,
          })

          fetch("/api/maintenances/save/calendar", {
            method: "post",
            body: JSON.stringify({
              mid: maintenance.id,
              cid: calId,
              updatedBy: session.user.email,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((resp) => resp.json())
            .catch((err) => console.error(err))
        } else if (statusText === "failed") {
          Notify("error", "Error Creating Calendar Entry", data.statusText)
        }
      })
      .catch((err) => console.error(`Error - ${err}`))
  }

  function handleCalendarUpdate(startDateTime, endDateTime, rcounter) {
    const { calendarId: calId, name: company, id: maintId } = maintenance
    const currentMaint = formRef.current.values

    let supplierCID = ""
    currentMaint.supplierCids.forEach((supp) => {
      const supplierLabel = supplierCids.filter(
        (supplier) => supplier.value === supp
      )
      if (supplierLabel[0].label) {
        supplierCID += ` ${supplierLabel[0].label}`
      }
    })
    supplierCID = supplierCID.trim()

    let cids = ""
    customerCids.forEach((cid) => {
      cids += ` ${cid.kundencid}`
    })
    cids = cids.trim()

    if (calId) {
      fetch("/v1/api/calendar/reschedule", {
        method: "post",
        body: JSON.stringify({
          company,
          cids,
          maintId,
          calId,
          startDateTime,
          endDateTime,
          rcounter,
          supplierCID,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.status === 200 && data.statusText === "OK") {
            Notify("success", "Calendar Entry Rescheduled")
          }
        })
        .catch((err) => console.error(err))
    } else {
      Notify("warning", "No Calendar Entry ID Available!")
    }
  }

  /// /////////////////////////////////////////////////////////
  //
  //                INPUTS: ONCHANGE
  //
  /// /////////////////////////////////////////////////////////

  const handleEditorChange = (data) => {
    setMailBodyText(data.level.content)
  }

  /// /////////////////////////////////////////////////////////
  //
  //                MODAL: TOGGLE
  //
  /// /////////////////////////////////////////////////////////

  // open / close Read Modal
  const toggleReadModal = () => {
    if (!maintenance.incomingBody) {
      const mailId = maintenance.mailId || maintenance.receivedmail
      if (mailId === "NT") {
        Notify(
          "warning",
          "Mail Not Available",
          "Maintenance was created manually."
        )
        return
      }
      fetch(`/v1/api/mail/${mailId}`)
        .then((resp) => resp.json())
        .then((data) => {
          let mailBody
          const htmlRegex = new RegExp(
            /<(?:"[^"]*"[`"]*|'[^']*'['"]*|[^'">])+>/,
            "gi"
          )
          // const htmlRegex2 = new RegExp('<([a-z]+)[^>]*(?<!/)>', 'gi')
          // const htmlRegex3 = new RegExp('<meta .*>', 'gi')

          if (htmlRegex.test(data.body)) {
            mailBody = data.body
          } else {
            mailBody = `<pre>${data.body}</pre>`
          }
          setMaintenance({
            ...maintenance,
            incomingBody: mailBody,
            incomingFrom: data.from,
            incomingSubject: data.subject,
            incomingDate: data.date,
            incomingAttachments: data.attachments,
            incomingDomain: serverData.maildomain,
          })
          setOpenReadModal(!openReadModal)
        })
        .catch((err) => console.error(`Error - ${err}`))
    } else {
      setOpenReadModal(!openReadModal)
    }
  }

  const toggleConfirmFreezeModal = () => {
    setOpenConfirmFreezeModal(!openConfirmFreezeModal)
  }

  /// /////////////////////////////////////////////////////////
  //
  //                    OTHER ACTIONS
  //
  /// /////////////////////////////////////////////////////////

  const handleCreateOnClick = () => {
    const { bearbeitetvon, maileingang, lieferant, mailId, updatedAt } =
      maintenance

    let incomingFormatted
    if (mailId === "NT") {
      incomingFormatted = format(new Date(updatedAt), "yyyy-MM-dd HH:mm:ss")
    } else {
      incomingFormatted = format(new Date(maileingang), "yyyy-MM-dd HH:mm:ss")
    }
    const updatedAtFormatted = format(
      new Date(updatedAt || Date.now()),
      "yyyy-MM-dd HH:mm:ss"
    )

    fetch("/api/maintenances", {
      method: "POST",
      body: JSON.stringify({
        bearbeitetvon,
        lieferant,
        mailid: mailId,
        updatedat: moment(updatedAtFormatted).format(),
        maileingang: moment(incomingFormatted).format(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        const newMaint = {
          ...maintenance,
          id: data.id,
          name: data.suppliercompany.name,
          maildomain: data.suppliercompany.maildomain,
        }
        setMaintenance(newMaint)
        const newLocation = `/maintenance?id=${data.id}`
        router.push(newLocation, newLocation, { shallow: false })

        if (data.id) {
          Notify("success", "Create Success")
        } else {
          Notify("error", "Create Error", data.err)
        }
      })
      .catch((err) => console.error(err))

    // mark mail as read in connected gmail inbox
    const incomingMailId = maintenance.mailId || maintenance.receivedmail
    if (incomingMailId !== "NT") {
      fetch("/v1/api/inbox/delete", {
        method: "post",
        body: JSON.stringify({ m: incomingMailId }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.status === "complete") {
            Notify("success", "Message Removed from Inbox")
          } else if (data.id === 500) {
            Notify("error", "Error Removing Message from Inbox")
          }
        })
        .catch((err) => console.error(`Error - ${err}`))
    }
  }

  const generateMailSubject = () => {
    let text = rescheduleData.length > 0 ? " [RESCHEDULED]" : ""
    text += formRef.current.values.emergency ? " [EMERGENCY]" : ""
    text += formRef.current.values.cancelled ? " [CANCELLED]" : ""
    text += " Planned Work Notification - NT-" + maintenance.id
    if (rescheduleData.length) {
      text += "-" + rescheduleData[rescheduleData.length - 1].rcounter
    }
    setMailPreviewSubject(text.trim())
    return text
  }

  /// /////////////////////////////////////////////////////////
  //
  //                      RENDER
  //
  /// /////////////////////////////////////////////////////////

  if (session) {
    const HeaderLeft = () => {
      return (
        <ButtonGroup size="md">
          <IconButton
            appearance="subtle"
            onClick={() => Router.push("/history")}
            icon={
              <svg
                width="18"
                height="18"
                style={{ marginRight: "10px" }}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            }
            style={{
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            Back
          </IconButton>
          <Whisper
            placement="bottom"
            speaker={<Tooltip>Open Incoming Mail</Tooltip>}
          >
            <IconButton
              appearance="subtle"
              onClick={toggleReadModal}
              icon={
                <svg
                  width="18"
                  height="18"
                  style={{ marginRight: "10px" }}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
              style={{
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Read
            </IconButton>
          </Whisper>
        </ButtonGroup>
      )
    }

    const HeaderCenter = () => {
      return (
        <div>
          <Whisper
            placement="left"
            speaker={<Tooltip>Open Company History</Tooltip>}
          >
            <Button
              appearance="subtle"
              size="lg"
              onClick={() =>
                Router.push(
                  {
                    pathname: "/companies",
                    query: {
                      company: maintenance.name,
                    },
                  },
                  "/companies"
                )
              }
              style={{
                display: "inline",
                fontSize: "1.1em",
                fontWeight: "200",
              }}
            >
              {maintenance.name}
            </Button>
          </Whisper>
          <div
            appearance="subtle"
            size="lg"
            style={{
              display: "inline",
              color: "var(--grey4)",
              fontSize: "1.1em",
              fontWeight: "200",
              padding: "5px 10px",
              border: "1px solid var(--grey2)",
              borderRadius: "5px",
            }}
          >
            {maintenance.id === "NEW" ? "NEW" : `NT-${maintenance.id}`}
          </div>
        </div>
      )
    }

    const HeaderRight = () => {
      return (
        <ButtonGroup size="md">
          <Whisper
            placement="bottom"
            speaker={<Tooltip>Create Calendar Entry</Tooltip>}
          >
            <IconButton
              appearance="subtle"
              onClick={handleCalendarCreate}
              icon={
                <svg
                  width="18"
                  height="18"
                  style={{ marginRight: "10px" }}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              style={{
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Create
            </IconButton>
          </Whisper>
          {maintenance.id === "NEW" ? (
            <Whisper
              placement="bottom"
              speaker={<Tooltip>Create New Maintenance</Tooltip>}
            >
              <IconButton
                appearance="subtle"
                onClick={handleCreateOnClick}
                icon={
                  <svg
                    width="18"
                    height="18"
                    style={{ marginRight: "10px" }}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                }
                style={{
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                className="create-btn"
              >
                Save
              </IconButton>
            </Whisper>
          ) : (
            <Whisper
              placement="bottom"
              speaker={<Tooltip>Send All Notification Mails</Tooltip>}
            >
              <IconButton
                appearance="subtle"
                onClick={handleSendAll}
                icon={
                  <svg
                    width="18"
                    height="18"
                    style={{ marginRight: "10px" }}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                style={{
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                Send All
              </IconButton>
            </Whisper>
          )}
        </ButtonGroup>
      )
    }

    const TimezoneSelector = ({ field, form }) => {
      return (
        <Select
          options={tzOptions}
          isDisabled={maintenance.id === "NEW"}
          name={field.name}
          value={
            tzOptions
              ? tzOptions.find((option) => option.value === field.value)
              : null
          }
          onChange={(option) => form.setFieldValue(field.name, option.value)}
          className="timezone-select"
        />
      )
    }

    const SupplierSelector = ({ field, form }) => {
      return (
        <SelectPicker
          style={{ width: "100%" }}
          name={field.name}
          disabled={maintenance.id === "NEW"}
          value={field.value}
          onChange={(option) => {
            fetch(`/api/lieferantcids?id=${option}`)
              .then((resp) => resp.json())
              .then((data) => {
                if (!data.lieferantCIDsResult) {
                  setSupplierCids([
                    {
                      label: "No CIDs available for this Supplier",
                      value: "1",
                    },
                  ])
                  return
                }
                setMaintenance({
                  ...maintenance,
                  lieferant: option,
                  name: suppliers.find((options) => options.value === option)
                    .label,
                })
                setSupplierCids(data.lieferantCIDsResult)
                setCustomerCids([])
                gridApi.current.hideOverlay()
              })
              .catch((err) => console.error(err))
            form.setFieldValue(field.name, option)
            form.setFieldValue("supplierCids", [])
          }}
          data={suppliers ?? []}
          placeholder="Please select a Supplier"
        />
      )
    }

    const MyToggle = ({ field, form, checkedChildren = "" }) => {
      return (
        <Toggle
          size="lg"
          disabled={maintenance.id === "NEW"}
          checkedChildren={checkedChildren}
          checked={field.value}
          name={field.name}
          onChange={(option) => {
            form.setFieldValue(field.name, option)

            // Actions required on marking 'Done':
            if (field.name === "done" && option === true) {
              // Set Mail as READ in Gmail Mailbox
              if (maintenance.receivedmail !== "NT") {
                fetch("/v1/api/inbox/markcomplete", {
                  method: "post",
                  body: JSON.stringify({ m: maintenance.receivedmail }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
                  .then((resp) => resp.json())
                  .then((data) => {
                    if (data.id === 500) {
                      Notify(
                        "error",
                        "Error",
                        "Cannot move mail to complete label."
                      )
                    }
                  })
                  .catch((err) => console.error(`Error - ${err}`))
              }
              // Set 'impacted CIDs'
              let impactedCids = ""
              customerCids.forEach((entry) => {
                impactedCids += ` ${entry.kundenCID}`
              })
              fetch("/api/maintenances/save/impactedcids", {
                method: "post",
                body: JSON.stringify({
                  cids: impactedCids.trim(),
                  maintId: maintenance.id,
                  updatedBy: session.user.email.match(/^([^@]*)@/)[1],
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              })
                .then((resp) => resp.json())
                .then((data) => {
                  if (!data.status === 200) {
                    Notify("error", "Impacted CIDs Not Saved")
                  }
                })
                .catch((err) => console.error(`Error - ${err}`))

              // update algolia search index with latest created maintenance
              fetch("/v1/api/search/update", {
                method: "post",
                body: JSON.stringify({
                  maintId: maintenance.id,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              })
            }
          }}
        />
      )
    }

    return (
      <Layout>
        {maintenance.id === "NEW" && (
          <Message
            full
            showIcon
            type="info"
            description='Remember to click "Save" before continuing to work!'
            style={{ position: "fixed", zIndex: "999" }}
          />
        )}
        <Head>
          <title>{`NT-${maintenance.id} | Newtelco Maintenance`}</title>
        </Head>
        <MaintPanel
          className="maintpanel maintenance-header"
          header={<HeaderLeft />}
          center={<HeaderCenter />}
          buttons={<HeaderRight />}
        >
          <FlexboxGrid
            justify="space-around"
            align="top"
            style={{ width: "100%" }}
          >
            <FlexboxGrid.Item colspan={11} style={{ margin: "0 10px" }}>
              <Panel bordered>
                <Grid fluid>
                  <Formik
                    innerRef={formRef}
                    validateOnChange={false}
                    validateOnBlur={false}
                    initialValues={{
                      timezone: serverData.timezone || null,
                      sendermaintenanceid: serverData.sendermaintenanceid,
                      supplier: serverData.supplierid,
                      startdatetime: serverData.startdatetime,
                      enddatetime: serverData.enddatetime,
                      suppliercids: serverData.derencidid,
                      impact: serverData.impact,
                      location: serverData.location,
                      reason: serverData.reason,
                      maintnote: serverData.maintnote,
                      cancelled: !!+serverData.cancelled,
                      emergency: !!+serverData.emergency,
                      done: !!+serverData.done,
                    }}
                    onSubmit={async (values, formikHelpers) => {
                      const diff = objDiff(maintHistory, values)
                      setMaintHistory(values)
                      if (values.suppliercids && !customerCids.length) {
                        fetchCustomerCids(values.suppliercids)
                      }
                      if (Object.keys(diff).length) {
                        if (maintenance.id === "NEW") {
                          Notify(
                            "error",
                            "Unable to Save",
                            "Not maintenance ID created yet."
                          )
                          return
                        }
                        try {
                          await fetch("/api/maintenances", {
                            method: "PUT",
                            body: JSON.stringify({
                              id: maintenance.id,
                              values: values,
                              user: session.user.email.match(/^([^@]*)@/)[1],
                              field: Object.keys(diff)[0],
                            }),
                            headers: {
                              "Content-Type": "application/json",
                            },
                          })
                        } catch (e) {
                          formikHelpers.setErrors({ error: e })
                        }
                      }
                    }}
                  >
                    {({ values, setFieldValue }) => (
                      <>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={12} xs={12}>
                            <AutoSave debounceMs={1000} id={maintenance.id} />
                          </Col>
                          <Col sm={12} xs={12}>
                            <div
                              style={{
                                color: "var(--grey2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                              }}
                            >
                              <Whisper
                                placement="top"
                                speaker={<Tooltip>Mail Arrived</Tooltip>}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    style={{
                                      marginRight: "3px",
                                    }}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                                    />
                                  </svg>
                                  {convertDateTime(maintenance.maileingang)}
                                </div>
                              </Whisper>
                            </div>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel htmlFor="edited-by">
                                Created By
                              </ControlLabel>
                              <Input
                                tabIndex="-1"
                                readOnly
                                id="edited-by-input"
                                name="edited-by"
                                type="text"
                                value={maintenance.bearbeitetvon}
                                disabled
                              />
                            </FormGroup>
                          </Col>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel htmlFor="sendermaintenanceid">
                                Sender Maintenance ID
                              </ControlLabel>
                              <HelpBlock
                                style={{ marginTop: "0px", float: "right" }}
                                tooltip
                              >
                                Maintenance ID in Suppliers System <br />
                                For Documentation Purposes Only
                              </HelpBlock>
                              <FastField
                                name="sendermaintenanceid"
                                component={MyTextinput}
                                maintId={maintenance.id}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel htmlFor="supplier">
                                Timezone
                              </ControlLabel>
                              <FastField
                                name="timezone"
                                component={TimezoneSelector}
                              />
                            </FormGroup>
                          </Col>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel htmlFor="supplier">
                                Supplier
                              </ControlLabel>
                              <FastField
                                name="supplier"
                                component={SupplierSelector}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel
                                htmlFor="start-datetime"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                Start Date/Time
                              </ControlLabel>
                              <FastField
                                name="startdatetime"
                                startDateTime={values.startdatetime}
                                endDateTime={values.enddatetime}
                                setImpactPlaceholder={setImpactPlaceholder}
                                component={MyDateTime}
                                maintId={maintenance.id}
                              />
                              <HelpBlock
                                style={{ margin: "5px", opacity: "0.5" }}
                              >
                                Europe/Berlin:{" "}
                                {moment
                                  .tz(
                                    moment.tz(
                                      values.startdatetime,
                                      values.timezone
                                    ),
                                    "Europe/Berlin"
                                  )
                                  .format("DD.MM.YYYY HH:mm")}
                              </HelpBlock>
                            </FormGroup>
                          </Col>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel
                                htmlFor="end-datetime"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                End Date/Time
                              </ControlLabel>
                              <FastField
                                name="enddatetime"
                                startDateTime={values.startdatetime}
                                endDateTime={values.enddatetime}
                                setImpactPlaceholder={setImpactPlaceholder}
                                component={MyDateTime}
                                maintId={maintenance.id}
                              />
                              <HelpBlock
                                style={{ margin: "5px", opacity: "0.5" }}
                              >
                                Europe/Berlin:{" "}
                                {moment
                                  .tz(
                                    moment.tz(
                                      values.enddatetime,
                                      values.timezone
                                    ),
                                    "Europe/Berlin"
                                  )
                                  .format("DD.MM.YYYY HH:mm")}
                              </HelpBlock>
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={24}>
                            <FormGroup>
                              <ControlLabel htmlFor="their-cid">
                                {maintenance.name} CID
                              </ControlLabel>
                              <Field
                                name="supplierCids"
                                customerCids={customerCids}
                                setCustomerCids={setCustomerCids}
                                fetchCustomerCids={fetchCustomerCids}
                                supplierCids={supplierCids}
                                component={MyTagPicker}
                                maintId={maintenance.id}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={12} xs={24}>
                            <FormGroup>
                              <ControlLabel
                                htmlFor="impact"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                Impact
                                <ButtonGroup
                                  size="sm"
                                  style={{ float: "right" }}
                                >
                                  <Whisper
                                    placement="bottom"
                                    speaker={
                                      <Tooltip>
                                        Use 50ms Protection Switch Text
                                      </Tooltip>
                                    }
                                  >
                                    <IconButton
                                      id="protectionswitchtext"
                                      onClick={() =>
                                        setFieldValue(
                                          "impact",
                                          "50ms protection switch"
                                        )
                                      }
                                      size="sm"
                                      icon={<Icon icon="clock-o" />}
                                    />
                                  </Whisper>
                                  <Whisper
                                    placement="bottom"
                                    speaker={
                                      <Tooltip>
                                        Use Suggested Time Difference Text
                                      </Tooltip>
                                    }
                                  >
                                    <IconButton
                                      id="impactplaceholdertext"
                                      onClick={() =>
                                        setFieldValue(
                                          "impact",
                                          impactPlaceholder
                                        )
                                      }
                                      size="sm"
                                      icon={<Icon icon="history" />}
                                    />
                                  </Whisper>
                                </ButtonGroup>
                              </ControlLabel>
                              <FastField
                                name="impact"
                                component={MyTextinput}
                                placeholder={impactPlaceholder}
                                maintId={maintenance.id}
                              />
                            </FormGroup>
                          </Col>
                          <Col sm={12} xs={24}>
                            <FormGroup
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                height: "70px",
                              }}
                            >
                              <ControlLabel
                                htmlFor="location"
                                style={{ marginBottom: "10px" }}
                              >
                                Location
                              </ControlLabel>
                              <FastField
                                name="location"
                                component={MyTextinput}
                                maintId={maintenance.id}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={24}>
                            <FormGroup>
                              <ControlLabel htmlFor="reason">
                                Reason
                              </ControlLabel>
                              <FastField
                                name="reason"
                                component={MyTextarea}
                                maintId={maintenance.id}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col sm={24}>
                            <FormGroup>
                              <ControlLabel
                                htmlFor="maintnote"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                Note
                                <HelpBlock style={{ float: "right" }} tooltip>
                                  This note will be included in the mail
                                </HelpBlock>
                              </ControlLabel>
                              <FastField
                                name="maintnote"
                                key="maintnote"
                                component={MyTextarea}
                                maintId={maintenance.id}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row gutter={20} style={{ marginBottom: "20px" }}>
                          <Col
                            xs={8}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <FormGroup
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <ControlLabel>Cancelled</ControlLabel>
                              <Field
                                name="cancelled"
                                component={MyToggle}
                                checkedChildren={<Icon icon="ban" inverse />}
                              />
                            </FormGroup>
                          </Col>
                          <Col
                            xs={8}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <FormGroup
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <ControlLabel>Emergency</ControlLabel>
                              <Field
                                name="emergency"
                                component={MyToggle}
                                checkedChildren={
                                  <Icon icon="hospital-o" inverse />
                                }
                              />
                            </FormGroup>
                          </Col>
                          <Col
                            xs={8}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <FormGroup
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <ControlLabel>Done</ControlLabel>
                              <Field
                                name="done"
                                component={MyToggle}
                                checkedChildren={<Icon icon="check" inverse />}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                      </>
                    )}
                  </Formik>
                  <Row gutter={20} style={{ marginBottom: "20px" }}>
                    <Col>
                      {maintenance.id && (
                        <CommentList
                          user={session.user.email}
                          id={maintenance.id}
                          initialComment={serverData.notes}
                        />
                      )}
                    </Col>
                  </Row>
                </Grid>
              </Panel>
            </FlexboxGrid.Item>
            <FlexboxGrid.Item colspan={11} style={{ margin: "0 10px" }}>
              <Panel bordered className="panel-right">
                <Nav
                  justified
                  appearance="tabs"
                  reversed
                  activeKey={activeTab}
                  onSelect={(key) => setActiveTab(key)}
                  style={{ marginTop: "-1px" }}
                >
                  <Nav.Item eventKey="customer">Customer CIDs</Nav.Item>
                  <Nav.Item eventKey="reschedule">Reschedule</Nav.Item>
                  <Nav.Item eventKey="changelog">Changelog</Nav.Item>
                </Nav>
                <Grid fluid>
                  <Row>
                    <Col>
                      {activeTab === "customer" && (
                        <Row>
                          <Col>
                            <Container style={{ marginTop: "10px" }}>
                              <Row>
                                <Col>
                                  <Progress.Line
                                    percent={sentProgress}
                                    showInfo={false}
                                  />
                                </Col>
                              </Row>
                              <Row>
                                <Col
                                  style={{
                                    width: "100%",
                                    height: "500px",
                                    padding: "20px",
                                  }}
                                >
                                  <div
                                    className="ag-theme-material"
                                    style={{
                                      height: "100%",
                                      width: "100%",
                                    }}
                                  >
                                    <AgGridReact
                                      gridOptions={gridOptions}
                                      rowData={customerCids}
                                      onGridReady={handleGridReady}
                                      pagination
                                      immutableData
                                      getRowNodeId={(data) => {
                                        return data.kundencid
                                      }}
                                    />
                                  </div>
                                </Col>
                              </Row>
                            </Container>
                          </Col>
                        </Row>
                      )}
                      {activeTab === "changelog" && (
                        <Row>
                          <Col>
                            <Container style={{ padding: "20px" }}>
                              <Row>
                                <Col style={{ padding: "0 40px" }}>
                                  <Changelog maintId={maintenance.id} />
                                </Col>
                              </Row>
                            </Container>
                          </Col>
                        </Row>
                      )}
                      {activeTab === "reschedule" && (
                        <Row>
                          <Col>
                            <RescheduleGrid
                              maintId={maintenance.id}
                              user={session.user.email}
                              handleCalendarUpdate={handleCalendarUpdate}
                            />
                          </Col>
                        </Row>
                      )}
                    </Col>
                  </Row>
                </Grid>
              </Panel>
            </FlexboxGrid.Item>
          </FlexboxGrid>
        </MaintPanel>
        {openReadModal && (
          <ReadModal
            maintenance={maintenance}
            openReadModal={openReadModal}
            toggleReadModal={toggleReadModal}
            incomingAttachments={maintenance.incomingAttachments}
            jsonData={serverData}
          />
        )}
        {openPreviewModal && (
          <MailEditor
            open={openPreviewModal}
            onHide={togglePreviewModal}
            recipients={mailPreviewRecipients.toLowerCase()}
            subject={mailPreviewSubject}
            body={mailBodyText}
            customerCid={mailPreviewCustomerCID}
            sendMail={sendMail}
            onEditorChange={handleEditorChange}
          />
        )}
        {openConfirmFreezeModal && (
          <ConfirmModal
            show={openConfirmFreezeModal}
            onHide={toggleConfirmFreezeModal}
            header="Confirm Freeze"
            content={`There is a network freeze for <b>${
              frozenCompany || ""
            }</b>. Are you sure you want to send this mail?`}
            cancelAction={toggleConfirmFreezeModal}
            confirmAction={() =>
              prepareDirectSend(frozenState.recipient, frozenState.cid, false)
            }
          />
        )}
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
  const companiesResponse = await fetch(
    `${protocol}//${host}/api/companies?select=true`
  )
  const suppliers = await companiesResponse.json()
  if (query.id === "NEW") {
    return {
      props: {
        serverData: query,
        suppliers,
        session: await getSession({ req }),
      },
    }
  } else {
    const maintenanceRes = await fetch(
      `${protocol}//${host}/api/maintenances?mid=${query.id}`
    )
    const serverData = await maintenanceRes.json()
    return {
      props: {
        serverData,
        suppliers,
        session: await getSession({ req }),
      },
    }
  }
}

export default Maintenance
