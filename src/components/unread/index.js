import React, { useEffect } from 'react'
import Link from 'next/link'
import {
  Panel
} from 'rsuite'
import Store from '../store'
import './unread.css'

const UnreadBadge = ({ count }) => {
  const store = Store.useStore()

  useEffect(() => {
    store.set('count')(count)
  }, [count])

  return (
    <Panel header='Unread' bordered className='unread-panel'>
      <Link href='/inbox' passHref>
        <a className='unread-count'>{count}</a>
      </Link>
    </Panel>
  )
}

export default UnreadBadge