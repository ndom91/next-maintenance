import React from 'react'
import Layout from '../src/components/layout'
import fetch from 'isomorphic-unfetch'
import RequireLogin from '../src/components/require-login'
import { NextAuth } from 'next-auth/client'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { format, isValid } from 'date-fns'
import {
  faSave,
  faCalendarAlt,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons'
import {
  Container,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  ButtonToolbar,
  ButtonGroup,
  Button,
  Badge,
  Form,
  FormGroup,
  FormInput,
  FormTextarea
} from 'shards-react'

export default class Maintenance extends React.Component {
  static async getInitialProps ({ req, query }) {
    const host = req ? req.headers['x-forwarded-host'] : location.host
    const pageRequest = `https://${host}/api/maintenances/${query.id}`
    const res = await fetch(pageRequest)
    const json = await res.json()
    return {
      jsonData: json,
      session: await NextAuth.init({ req })
    }
  }

  constructor (props) {
    super(props)
    this.state = {
      width: 0,
      maintenance: {}
    }
  }

  componentDidMount () {
    this.setState({
      maintenance: this.props.jsonData.profile,
      width: window.innerWidth
    })
  }

  convertDateTime = (datetime) => {
    let newDateTime
    if (isValid(new Date(datetime))) {
      newDateTime = format(new Date(datetime), 'dd.MM.yyyy HH:mm')
    } else {
      newDateTime = datetime
    }
    return newDateTime
  }

  render () {
    const {
      maintenance
    } = this.state
    if (this.props.session.user) {
      return (
        <Layout session={this.props.session}>
          <Card style={{ maxWidth: '100%' }}>
            <CardHeader>
              <ButtonToolbar style={{ justifyContent: 'space-between' }}>
                <ButtonGroup size='md'>
                  <Link href='/history'>
                    <Button>
                      <FontAwesomeIcon icon={faArrowLeft} width='1em' style={{ marginRight: '10px', color: 'secondary' }} />
                      Back
                    </Button>
                  </Link>
                </ButtonGroup>
                <span>
                  <Badge style={{ fontSize: '2rem', marginRight: '20px' }} outline>
                    {maintenance.id}
                  </Badge>
                  <h2 style={{ display: 'inline-block', marginBottom: '0px' }}>{maintenance.name}</h2>
                </span>
                {this.state.width > 500
                  ? (
                    <ButtonGroup className='btn-group-2' size='md'>
                      <Button>
                        <FontAwesomeIcon icon={faCalendarAlt} width='1em' style={{ marginRight: '10px', color: 'secondary' }} />
                      Calendar
                      </Button>
                      <Button>
                        <FontAwesomeIcon icon={faSave} width='1em' style={{ marginRight: '10px', color: 'secondary' }} />
                      Save
                      </Button>
                    </ButtonGroup>
                  ) : (
                    <span />
                  )}
              </ButtonToolbar>
            </CardHeader>
            <CardBody>
              <Container fluid>
                <Row style={{ height: '20px' }} />
                <Row>
                  <Col sm='12' lg='6'>
                    <Row>
                      <Col>
                        <Row>
                          <Col style={{ width: '30vw' }}>
                            <FormGroup>
                              <label htmlFor='edited-by'>Edited By</label>
                              <FormInput id='edited-by-input' name='edited-by' type='text' value={maintenance.bearbeitetvon} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='supplier'>Supplier</label>
                              <FormInput id='supplier-input' name='supplier' type='text' value={maintenance.name} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='start-datetime'>Start Date/Time</label>
                              <FormInput id='start-datetime' name='start-datetime' type='text' value={this.convertDateTime(maintenance.startDateTime)} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='their-cid'>Their CID</label>
                              <FormInput id='their-cid' name='their-cid' type='text' value={maintenance.derenCID} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='impacted-customers'>Impacted Customer(s)</label>
                              <FormInput id='impacted-customers' name='impacted-customers' type='text' value={maintenance.betroffeneKunden} />
                            </FormGroup>
                          </Col>
                          <Col style={{ width: '30vw' }}>
                            <FormGroup>
                              <label htmlFor='maileingang'>Mail Arrived</label>
                              <FormInput id='maileingang-input' name='maileingang' type='text' value={this.convertDateTime(maintenance.maileingang)} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='updated-at'>Updated At</label>
                              <FormInput id='updated-at' name='updated-at' type='text' value={this.convertDateTime(maintenance.updatedAt)} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='end-datetime'>End Date/Time</label>
                              <FormInput id='end-datetime' name='end-datetime' type='text' value={this.convertDateTime(maintenance.endDateTime)} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='updated-by'>Updated By</label>
                              <FormInput id='updated-by' name='updated-by' type='text' value={maintenance.updatedBy} />
                            </FormGroup>
                            <FormGroup>
                              <label htmlFor='impacted-cids'>Impacted CID(s)</label>
                              <FormInput id='impacted-cids' name='impacted-cids' type='text' value={maintenance.betroffeneCIDs} />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <FormGroup>
                              <label htmlFor='notes'>Notes</label>
                              <FormTextarea id='notes' name='notes' size='lg' value={maintenance.notes} />
                            </FormGroup>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Col>
                  <Col sm='12' lg='6'>
                    <Row>
                      <Col>
                        <Row>
                          <div style={{ width: '100%', height: '100%', color: '#000' }}>
                            Placeholder
                          </div>
                        </Row>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Container>
            </CardBody>
            <CardFooter className='card-footer'>
              {this.state.width < 500
                ? (
                  <ButtonGroup className='btn-group-2' size='md'>
                    <Button>
                      <FontAwesomeIcon icon={faCalendarAlt} width='1em' style={{ marginRight: '10px', color: 'secondary' }} />
                      Calendar
                    </Button>
                    <Button>
                      <FontAwesomeIcon icon={faSave} width='1em' style={{ marginRight: '10px', color: 'secondary' }} />
                      Save
                    </Button>
                  </ButtonGroup>
                ) : (
                  <span />
                )}
            </CardFooter>
          </Card>
          <style jsx>{`
            * {
              font-family: Lato, Helvetica;
            }
            :global(#notes) {
              width: 100%;
              height:
            }
            :global(button.btn-primary) {
              max-height: 45px;
            }
            input {
              display: block;
            }
            label {
              margin: 15px;
            }
          `}
          </style>
        </Layout>
      )
    } else {
      return <RequireLogin />
    }
  }
}
