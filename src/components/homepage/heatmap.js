import React from 'react'
import useSWR from 'swr'
import { Panel, Loader } from 'rsuite'
import { Icon } from '@rsuite/icons'
import { ResponsiveCalendarCanvas } from '@nivo/calendar'

const Heatmap = () => {
  const { data } = useSWR(
    '/api/homepage/heatmap',
    (...args) => fetch(...args).then(res => res.json()),
    { revalidateOnFocus: false }
  )

  if (data) {
    return (
      <Panel
        bordered
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            Calendar
            <Icon
              as='calendar-o'
              style={{ color: 'var(--primary)' }}
              size='lg'
            />
          </div>
        }
        style={{ height: '100%' }}
      >
        <div style={{ width: '100%', maxWidth: '1100px', height: '400px' }}>
          <ResponsiveCalendarCanvas
            data={data.maintenances}
            minValue={0}
            maxValue={10}
            emptyColor='#eeeeee'
            colors={['#C6E2BA', '#8DC574', '#67B246', '#5A9C3D']}
            margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
            yearSpacing={40}
            monthBorderColor='#ffffff'
            dayBorderWidth={2}
            dayBorderColor='#ffffff'
          />
        </div>
      </Panel>
    )
  } else {
    return (
      <Panel
        bordered
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            Calendar
            <Icon
              as='calendar-o'
              style={{ color: 'var(--primary)' }}
              size='lg'
            />
          </div>
        }
        style={{ height: '100%' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '200px',
          }}
        >
          <Loader />
        </div>
      </Panel>
    )
  }
}

export default Heatmap
