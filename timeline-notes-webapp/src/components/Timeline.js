import React, { useEffect, useState } from 'react';
import '../styles/Timeline.css'

export default function Timeline({data}) {

  const [dateStack, setDateStack] =  useState([])

  const [dateRange, setDateRange] = useState([])

  useEffect(() => {
    if (data && data.relationships) {
      findMinMaxDates(data.relationships)
    }
    
  }, [data])

  const getYMD = (dateString) => {
    const components = dateString.split('-')

    let year
    let month
    let day

    if (components[0] === '') {
      year = -1 * parseInt(components[1])
      month = parseInt(components[2])
      day = parseInt(components[3])
    } else {
      year = parseInt(components[0])
      month = parseInt(components[1])
      day = parseInt(components[2])
    }

    return [year, month, day]
  } 

  // return -1 if d1 < d2
  // return 0 if equal
  // return 1 if d1 > d2
  const compareDates = (d1, d2) => {
    for (let i=0; i < d1.length; i++) {
      if (d1[i] < d2[i]) {
        return -1
      } else if (d1[i] > d2[i]) {
        return 1
      }
    }
    return 0
  }

  const findMinMaxDates = (relationships) => {
    let earliestStartDate = [Number.POSITIVE_INFINITY]
    let latestEndDate = [Number.NEGATIVE_INFINITY]
    console.log(relationships)
    relationships.forEach((rel) => {
      console.log(rel.fileName)
      let sd = getYMD(rel.startDate)
      if (compareDates(earliestStartDate, sd) > 0) {
        earliestStartDate = sd
      }

      
      let ed = getYMD(rel.endDate)
      if (compareDates(latestEndDate, ed) < 0) {
        latestEndDate = ed
      }
    })
    console.log("sd: ", earliestStartDate)
    console.log("ed: ", latestEndDate)
  }
    
  return (
    <div className="timeline-container">
      <div className="sub-timeline-container">Item 1</div>
      <div className="sub-timeline-container">Item 2</div>
      <div className="sub-timeline-container">Item 3</div>
      <div className="sub-timeline-container">Item 4</div>
    </div>
  );
}