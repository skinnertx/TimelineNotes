import React, { useEffect, useState } from 'react';
import '../styles/Timeline.css'

// class to store information about an event
class Event {
  // types:
  // sd: EventDate
  // ed: EventDate
  // parent: string
  // fileName: string
  constructor(sd, ed, parent, fileName) {
    this.startDate = sd
    this.endDate = ed
    this.parent = parent
    this.fileName = fileName
  }

  isRange() {
    return this.startDate.equals(this.endDate)
  }
}

class EventDate {
  constructor(dateString) {
    // construct a special date of positive infinity
    if(dateString === "+") {
      this.year = Number.POSITIVE_INFINITY
      this.month = Number.POSITIVE_INFINITY
      this.day = Number.POSITIVE_INFINITY
      this.hour = Number.POSITIVE_INFINITY
      this.minute = Number.POSITIVE_INFINITY
      this.second = Number.POSITIVE_INFINITY
    }

    // construct a special date of negative infinity
    if(dateString === "-") {
      this.year = Number.NEGATIVE_INFINITY
      this.month = Number.NEGATIVE_INFINITY
      this.day = Number.NEGATIVE_INFINITY
      this.hour = Number.NEGATIVE_INFINITY
      this.minute = Number.NEGATIVE_INFINITY
      this.second = Number.NEGATIVE_INFINITY
    }

    // if no time, add time
    if (!dateString.includes(" ")) {
      dateString = dateString + " 00:00:00"
    }
    
    // split into parts
    var tokens = dateString.split(/[- :]/)

    // handle BC case
    if (tokens[0] === "") {
      tokens.shift()
      this.year = tokens[0] * -1
    } else {
      this.year = Number(tokens[0])
    } 
    // rest of data
    this.month = Number(tokens[1])
    this.day = Number(tokens[2])
    this.hour = Number(tokens[3])
    this.minute = Number(tokens[4])
    this.second = Number(tokens[5])
  }

  equals(other) {
    if (other instanceof EventDate) {
      return this.year === other.year &&
             this.month === other.month &&
             this.day === other.day &&
             this.hour === other.hour &&
             this.minute === other.minute &&
             this.second === other.second
    }
    return false
  }

  compare(other) {
    if (other instanceof EventDate) {
      if (this.year !== other.year) {
        return this.year < other.year ? -1 : 1;
      }
      if (this.month !== other.month) {
          return this.month < other.month ? -1 : 1;
      }
      if (this.day !== other.day) {
          return this.day < other.day ? -1 : 1;
      }
      if (this.hour !== other.hour) {
          return this.hour < other.hour ? -1 : 1;
      }
      if (this.minute !== other.minute) {
          return this.minute < other.minute ? -1 : 1;
      }
      if (this.second !== other.second) {
          return this.second < other.second ? -1 : 1;
      }
      return 0;
    }
    console.error("date comparison got unknown type")
  }

}

export default function Timeline({data}) {

  // track previous ranges for zoom out functionality
  const [rangeStack, setRangeStack] = useState([])

  // list of all events
  const [eventList, setEventList] = useState([])

  // list of events in view
  const [eventsInView, setEventsInView] = useState([])

  // timeline range for currently viewed events (earliest date, latest date)
  const [timelineRange, setTimelineRange] = useState([])


  
  // create the list of events from json data
  function createEventList(relationships) {

    let tempEventList = []

    relationships.forEach((rel) => {
      let eventStartDate = new EventDate(rel.startDate)
      let eventEndDate = new EventDate(rel.endDate)

      let event = new Event(eventStartDate, eventEndDate, rel.parentFolder, rel.fileName)

      tempEventList.push(event)
    })

    setEventList(prevEventList => [...prevEventList, ...tempEventList])
  }

  // get the earliest and latests dates in the list
  function getTimelineRange() {
    // special infinity dates
    let earliestStartDate = new EventDate("-")
    let latestEndDate = new EventDate("+")
    // loop thru each event and compare
    eventsInView.forEach((ev) => {
      if (ev.startDate.compare(earliestStartDate) < 0) {
        earliestStartDate = ev.startDate
      }

      if (ev.endDate.compare(latestEndDate) > 0) {
        latestEndDate = ev.endDate
      }
    })

    setTimelineRange([earliestStartDate, latestEndDate])
  }

  // on load calculate base stats of timeline
  // this should run once on page load, when data is recieved
  useEffect(() => {
    if (data && data.relationships) {

      // parse json data into list of events
      createEventList(data.relationships)
      setEventsInView(eventList)

      console.log(eventList)
    }
  }, [data])


  // whenever the events in current view is updated, we get the new range
  useEffect(() => {
    getTimelineRange()
    
  }, [eventsInView])

  // when the range is updated, get the date ticks!
  useEffect(() => {
    // TODO get the date ticks
    console.log("range: ", timelineRange)
  }, [timelineRange])

  // TODO after the date ticks are populated, display to screen!

  // TODO add buttons to zoom in/out ->
    /* 
      button should filter all events based on the date tick range
      then set events in current view to the filtered list which causes the useEffect chain to trigger
      range should also be pushed to rangeStack so you can back up and out

      when zooming out, pop range from stack and filter events then set events in view as before
    */
    
  return (
    <div className="timeline-container">
      <div className="sub-timeline-container">Item 1</div>
      <div className="sub-timeline-container">Item 2</div>
      <div className="sub-timeline-container">Item 3</div>
      <div className="sub-timeline-container">Item 4</div>
    </div>
  );
}