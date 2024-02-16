import React, { useEffect, useState } from 'react';
import '../styles/Timeline.css'

const secInYear = 365 * 24 * 60 * 60
const secInMonth = 30 * 24 * 60 * 60
const secInDay = 24 * 60 * 60
const secInHour = 60 * 60
const secInMinute = 60

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

    switch(dateString) {
      case "+":
        this.year = Number.POSITIVE_INFINITY
        this.month = Number.POSITIVE_INFINITY
        this.day = Number.POSITIVE_INFINITY
        this.hour = Number.POSITIVE_INFINITY
        this.minute = Number.POSITIVE_INFINITY
        this.second = Number.POSITIVE_INFINITY
        break;

      case "-":
        this.year = Number.NEGATIVE_INFINITY
        this.month = Number.NEGATIVE_INFINITY
        this.day = Number.NEGATIVE_INFINITY
        this.hour = Number.NEGATIVE_INFINITY
        this.minute = Number.NEGATIVE_INFINITY
        this.second = Number.NEGATIVE_INFINITY
        break;

      case "e":
        this.year = NaN
        this.month = NaN
        this.day = NaN
        this.hour = NaN
        this.minute = NaN
        this.second = NaN
        break;

      default:
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

  }

  equals(other) {
    if (other instanceof EventDate) {
      return (this.compare(other) === 0)
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

  midpoint(other) {
    let midpointEvent = new EventDate("e")
    if (other instanceof EventDate) {

      let compVal = this.compare(other)
      if (compVal === 0) {
        midpointEvent.year = this.year
        midpointEvent.month = this.month
        midpointEvent.day = this.day 
        midpointEvent.hour = this.hour
        midpointEvent.minute = this.minute
        midpointEvent.second = this.second
      } else {
        
        let secAvg = (this.seconds() + other.seconds()) / 2
        
        midpointEvent.year = Math.floor(secAvg / secInYear)
        secAvg -= midpointEvent.year * secInYear

        midpointEvent.month = Math.floor(secAvg / secInMonth)
        secAvg -= midpointEvent.month * secInMonth

        midpointEvent.day = Math.floor(secAvg / secInDay)
        secAvg -= midpointEvent.day * secInDay

        midpointEvent.hour = Math.floor(secAvg / secInHour)
        secAvg -= midpointEvent.hour * secInHour

        midpointEvent.minute = Math.floor(secAvg / secInMinute)
        secAvg -= midpointEvent.minute * secInMinute

        midpointEvent.second = secAvg
      }

    } else {
      console.error("other not of type date in midpoint")
    }
    return midpointEvent
  }

  seconds() {
    let sum = 0
    sum += this.year * secInYear
    sum += this.month * secInMonth
    sum += this.day * secInDay
    sum += this.hour * secInHour
    sum += this.minute * secInMinute
    sum += this.second

    return sum
  }
}

export default function Timeline({data}) {

  // track previous ranges for zoom out functionality
  const [rangeStack, setRangeStack] = useState([])

  // list of all events
  const [eventList, setEventList] = useState([])

  // list of events in view
  // TODO: what happens if there is only one event in view, or even 0?
  const [eventsInView, setEventsInView] = useState([])

  // timeline range for currently viewed events (earliest date, latest date)
  const [timelineRange, setTimelineRange] = useState([])

  // list of all ticks that can be used to delimit timeline sections
  const [timelineTicks, setTimelineTicks] = useState([])


  
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

    if (eventsInView.length === 0) { return }
    // special infinity dates
    let earliestStartDate = new EventDate("+")
    let latestEndDate = new EventDate("-")
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

  function getTimelineTicks() {

    if (timelineRange.length < 2) { return }

    let sd = timelineRange[0]
    let ed = timelineRange[1]
    let md = sd.midpoint(ed)
    let smd = sd.midpoint(md)
    let emd = md.midpoint(ed)
    
    setTimelineTicks([sd, smd, md, emd, ed])
  }

  function TimelineTick({eventDate, isFirstTick = false }) {

    if (!eventDate) {return}

    if (isFirstTick) {
      return (
        <div className="first-tick">
          {(eventDate.year < 0) ?  <div className='f-inner-tick'>Year: {(eventDate.year * -1).toLocaleString()} BCE</div> : <div className='f-inner-tick'>Year: {(eventDate.year)} CE</div>}
        </div>
        
      )
    } else {
      return (
        <div className="timeline-tick">
          {(eventDate.year < 0) ?  <div className='inner-tick'>Year: {(eventDate.year * -1).toLocaleString()} BCE</div> : <div className='inner-tick'>Year: {(eventDate.year)} CE</div>}
        </div>
      )
    }

   
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
    getTimelineTicks()
  }, [timelineRange])

  useEffect(() => {
    console.log("timeline ticks: ", timelineTicks)
  }, [timelineTicks]) 

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
      
      <div className="sub-timeline-container">
        <TimelineTick eventDate={timelineTicks[0]} isFirstTick={true}/>
        Item 1
        <TimelineTick eventDate={timelineTicks[1]}/>
      </div>
      
      <div className="sub-timeline-container">
        Item 2
        <TimelineTick eventDate={timelineTicks[2]}/>
      </div>
      
      <div className="sub-timeline-container">
        Item 3
        <TimelineTick eventDate={timelineTicks[3]}/>
      </div>
      
      <div className="sub-timeline-container">
        Item 4
        <TimelineTick eventDate={timelineTicks[4]}/>
      </div>
      
    </div>
  );
}