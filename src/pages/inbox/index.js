import React, { useState, useEffect } from 'react'
import Layout from '../../components/layout'
import RequireLogin from '../../components/require-login'
import fetch from 'isomorphic-unfetch'
import { NextAuth } from 'next-auth/client'
import useSWR from 'swr'
import MaintPanel from '../../components/panel'
import InboxItem from '../../components/inboxitem'
import Notify from '../../lib/notification'
import Store from '../../components/store'
import {
  List,
  Modal,
  Avatar,
  IconButton,
  Icon,
  Input,
  InputGroup,
  Whisper,
  Tooltip,
  FlexboxGrid,
  Alert
} from 'rsuite'

const Inbox = props => {
  const store = Store.useStore()
  const unread = store.get('count')
  const [isHtml, setIsHtml] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [modalInfo, setModalInfo] = useState({})
  const [isTranslated, setIsTranslated] = useState(false)
  const [ogModalBody, setOgModalBody] = useState('')
  // cleanup whether SWR gets inbox items initally or getInitialProps, or what
  const [ inboxMails, setInboxMails ] = useState(props.inboxItems)
  const { data } = useSWR(
    '/v1/api/inbox', 
    url => fetch(url).then(res => res.json()),
    { refreshInterval: 30000, focusThrottleInterval: 10000, initialData: props.inboxItems }
  )

  useEffect(() => {
    setInboxMails(data)
  }, [data])

  useEffect(() => {
    if (inboxMails.length > 0) {
      inboxMails.forEach((mail, index) => {
        if (mail.faviconUrl.length === 0) {
          const mailDomain = mail.domain
          fetch(`/v1/api/favicon?d=${mailDomain}`, {
            method: 'get'
          })
            .then(resp => resp.json())
            .then(data => {
              const iconUrl = data.icons
              if (data.icons.substr(0, 4) !== 'http') {
                // const newInboxMails = inboxMails
                // newInboxMails[index].faviconUrl = `https://${iconUrl}`
                mail.faviconUrl = `https://${iconUrl}`
                inboxMails[index] = mail
                setInboxMails(inboxMails)
              } else {
                const newInboxMails = inboxMails
                newInboxMails[index].faviconUrl = iconUrl
                setInboxMails(newInboxMails)
              }
            })
        }
      })
    }
  }, [])


  const toggle = (mailId) => {
    if (mailId) {
      const activeMail = inboxMails.findIndex(el => el.id === mailId)

      let mailBody = inboxMails[activeMail].body
      const htmlRegex = new RegExp(/<(?:"[^"]*"[`"]*|'[^']*'['"]*|[^'">])+>/, 'gi')
      // const htmlRegex2 = new RegExp('<([a-z]+)[^>]*(?<!/)>', 'gi')
      // const htmlRegex3 = new RegExp('<meta .*>', 'gi')

      if (htmlRegex.test(mailBody)) {
        setIsHtml(true)
      } else {
        mailBody = `<pre>${mailBody}</pre>`
        setIsHtml(false)
      }
      const modalInfo = {
        subject: inboxMails[activeMail].subject,
        from: inboxMails[activeMail].from,
        favicon: inboxMails[activeMail].faviconUrl,
        body: mailBody
      }
      setIsOpen(!isOpen)
      setModalInfo(modalInfo)
    } else {
      setIsOpen(!isOpen)
    }
  }

  const handleTranslate = () => {
    const modalBody = modalInfo.body

    if (isTranslated) {
      setModalInfo({...modalInfo, body: ogModalBody })
      setIsTranslated(!isTranslated)
    } else {
      fetch(`/v1/api/translate`, {
        method: 'post',
        body: JSON.stringify({ q: modalBody }),
        mode: 'cors',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      })
        .then(resp => resp.json())
        .then(data => {
          const text = data.translatedText
          setOgModalBody(modalBody)
          setModalInfo({...modalInfo, body: text })
          setIsTranslated(!isTranslated)
        })
        .catch(err => console.error(`Error - ${err}`))
    }
  }

  const onDelete = (mailId) => {
    fetch(`/v1/api/inbox/delete`, {
      method: 'post',
      body: JSON.stringify({ m: mailId }),
      mode: 'cors',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    })
      .then(resp => resp.json())
      .then(data => {
        if (data.status === 'complete') {
          Notify('success', 'Message Deleted')
          const newUnread = unread - 1
          const array = inboxMails
          const index = inboxMails.findIndex(el => el.id === data.id)
          if (index !== -1) {
            array.splice(index, 1)
            setInboxMails(array)
            store.set('count')(newUnread)
          }
        }
      })
      .catch(err => console.error(`Error - ${err}`))
  }

  if (props.session.user) {
    return (
      <Layout night={false} count={unread} session={props.session}>
        <MaintPanel header='Inbox'>
          {inboxMails.length === 0 ? (
            <FlexboxGrid justify='center' align='middle' style={{ margin: '40px 0' }}>
              <FlexboxGrid.Item>
                <img src='/static/images/inbox0.svg' alt='Inbox' style={{ width: '400px' }} />
                <h4 style={{ textAlign: 'center' }}>Congrats, nothing to do!</h4>
              </FlexboxGrid.Item>
            </FlexboxGrid>
          ) : (
            <List bordered>
              {Array.isArray(inboxMails) && inboxMails.map((mail, index) => {
                return (
                  <List.Item key={index}>
                    <InboxItem
                      mail={mail}
                      index={index}
                      handleDelete={onDelete}
                      toggle={toggle}
                    />
                  </List.Item>
                )
              })}
            </List>
          )}
        </MaintPanel>
        {isOpen && (
          <Modal className='mail-modal-body' autoFocus backdrop show={isOpen} size='lg' onHide={() => toggle(null)} full>
            <Modal.Header>
              <FlexboxGrid justify='start' align='middle' style={{ width: '100%' }}>
                <FlexboxGrid.Item colspan={2}>
                  <Avatar
                    size='lg'
                    src={modalInfo.favicon}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </FlexboxGrid.Item>
                <FlexboxGrid.Item colspan={20}>
                  <div className='modal-preview-text-wrapper'>
                    <InputGroup className='modal-textbox' >
                      <InputGroup.Addon style={{ height: '31px' }} type='prepend'>
                        From
                      </InputGroup.Addon>
                      <Input readonly='readonly' value={modalInfo.from} />
                    </InputGroup>
                    <InputGroup className='modal-textbox' >
                      <InputGroup.Addon style={{ height: '31px' }} type='prepend'>
                        Subject
                      </InputGroup.Addon>
                      <Input type='text' readonly='readonly' value={modalInfo.subject} />
                    </InputGroup>
                  </div>
                </FlexboxGrid.Item>
                <FlexboxGrid.Item colspan={1} style={{ marginLeft: '30px' }}>
                  <Whisper speaker={<Tooltip>Translate</Tooltip>} placement='bottom'>
                    <IconButton
                      onClick={handleTranslate}
                      appearance='ghost'
                      style={{ color: 'var(--grey4)' }}
                      size='lg'
                      icon={<Icon icon='globe' />}
                    />
                  </Whisper>
                </FlexboxGrid.Item>
              </FlexboxGrid>
            </Modal.Header>
            <Modal.Body className='mail-body'>
              <div dangerouslySetInnerHTML={{ __html: modalInfo.body }} style={{ padding: '20px' }} />
            </Modal.Body>
          </Modal>
        )}
      </Layout>
    )
  } else {
    return <RequireLogin />
  }
}

Inbox.getInitialProps = async ({ req }) => {
    const host = req ? req.headers['x-forwarded-host'] : window.location.hostname
    const protocol = 'https:'
    if (host.indexOf('localhost') > -1) {
      protocol = 'http:'
    }
    const pageRequest = `${protocol}//${host}/v1/api/inbox`
    const res = await fetch(pageRequest, {
      mode: 'cors',
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    })
    const inboxContent = await res.json()
    return {
      inboxItems: inboxContent === 'No unread emails' ? [] : inboxContent,
      session: await NextAuth.init({ req })
    }
  }


export default Inbox