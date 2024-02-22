import React, { useEffect, useState, useRef } from 'react';
import '../styles/Timeline.css'

// this should probly have been an enum
const secInYear = 365 * 24 * 60 * 60
const secInMonth = 30 * 24 * 60 * 60
const secInDay = 24 * 60 * 60
const secInHour = 60 * 60
const secInMinute = 60

const RangeOverlap = {
  NONE: 0,
  CONTAINED: 1,
  LEFT: 2,
  RIGHT: 3,
  CONTAINS: 4
}

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

  // get placement as a percentage alng the timeline range
  // if it is outside the range, cap it back to the endpoints
  // we should be guaranteed some overlap with the range
  getEventPlacement(event) {

    const startSec = this.startDate.seconds()
    const endSec = this.endDate.seconds()


    const evStartSec = event.startDate.seconds()
    const evEndSec = event.endDate.seconds()

    let evStartOffset = (evStartSec - startSec) / (endSec - startSec)
    let evEndOffset = (evEndSec - startSec) / (endSec - startSec)

    // cap outputs
    if (evStartOffset < 0) {
      evStartOffset = 0
    }
    if (evEndOffset > 1) {
      evEndOffset = 1
    }

    return [evStartOffset, evEndOffset]
  }


  // return enum of RangeOverlap
  // usage, this.findOverlapRange(sd, ed)
  // returns the type of overlap between this event and ranfe specified by otherStart, otherEnd
  findOverlapRange(otherStart, otherEnd) {
    if (otherStart instanceof EventDate && otherEnd instanceof EventDate) {
      const startComparison = this.startDate.compare(otherStart)
      const endComparison = this.endDate.compare(otherEnd)

      // if exact match
      if (startComparison === 0 && endComparison === 0) {
        return RangeOverlap.CONTAINED
      // if this event contains other
      } else if (startComparison <= 0 && endComparison >= 0) {
        return RangeOverlap.CONTAINS
      // left overlap
      } else if (startComparison <=0 && endComparison <= 0) {
        if (this.endDate.compare(otherStart) >= 0) {
          return RangeOverlap.LEFT
        }
      // right overlap
      } else if (startComparison >= 0 && endComparison >= 0) {
        if(this.startDate.compare(otherEnd) <= 0) {
          return RangeOverlap.RIGHT
        }
      // this is contained by other
      } else if (startComparison >= 0 && endComparison <= 0) {
        return RangeOverlap.CONTAINED
      }

      // no relation
      return RangeOverlap.NONE
    }
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

  // usage this.compare(other)
  // if this preceeds other, return -1
  // if they are the same, return 0
  // if this is post other, return 1
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

  // list of all ticks that can be used to delimit timeline sections (list of eventDates)
  const [timelineTicks, setTimelineTicks] = useState([])

  // data to dynamically create
  // subticks to display between labeled ticks
  const [marginList, setMarginList] = useState([])
  const [ticks, setTicks] = useState([]);

  const timelineRef = useRef(null)

  const [timelineWidth, setTimelineWidth] = useState(0);

  // create the list of events from json data
  function createEventList(relationships) {

    let tempEventList = []

    relationships.forEach((rel) => {
      let eventStartDate = new EventDate(rel.startDate)
      let eventEndDate = new EventDate(rel.endDate)

      let event = new Event(eventStartDate, eventEndDate, rel.parentFolder, rel.fileName)

      tempEventList.push(event)
    })

    setEventList(tempEventList)
  }

  // get the earliest and latests dates in the list
  // called on load
  function getInitialTimelineRange() {
    if (eventList.length === 0) { return }
    // special infinity dates
    let earliestStartDate = new EventDate("+")
    let latestEndDate = new EventDate("-")
    // loop thru each event and compare
    eventList.forEach((ev) => {
      if (ev.startDate.compare(earliestStartDate) < 0) {
        earliestStartDate = ev.startDate
      }

      if (ev.endDate.compare(latestEndDate) > 0) {
        latestEndDate = ev.endDate
      }
    })

    setTimelineRange([earliestStartDate, latestEndDate])
  }

  // set timeline ticks
  function getTimelineTicks() {
    if (!timelineRange || timelineRange.length < 2) { return }

    let sd = timelineRange[0]
    let ed = timelineRange[1]
    let md = sd.midpoint(ed)
    let smd = sd.midpoint(md)
    let emd = md.midpoint(ed)
    
    setTimelineTicks([sd, smd, md, emd, ed])
  }

  // set margins for subtick size
  const calculateSubTickMargins = () => {
    const parentWidth = document.querySelector('.sub-timeline-container').offsetWidth
    const numTicks = Math.floor(parentWidth / 60)
    const offsetUnit = parentWidth / numTicks
    const margins = new Array(numTicks)
    for (let i = 1; i < numTicks; i++) {
      margins[i] = i * offsetUnit
    }
    setMarginList(margins)
  };

  // some repeated work here!!!
  const handleResize = () => {
    calculateSubTickMargins()
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.offsetWidth * 4)
    }
  };

  // filter events by current range
  function getEventsInView() {
    if (timelineRange.length !== 2) { return }
    let filteredEvents = []

      // filter events based on timeline range
      eventList.forEach((ev) => {
        const overlapType = ev.findOverlapRange(timelineRange[0], timelineRange[1])
        if (overlapType !== RangeOverlap.NONE) {

          filteredEvents.push(ev)
        }
      })
    
    setEventsInView(filteredEvents)
  }

  // handle a timeline sub section click
  // updaate range after pushign former range to stack
  // filter events
  function handleSubTimelineClick(section) {
    console.log(section)

    // push range to stack
    setRangeStack(prevRangeStack => [...prevRangeStack, timelineRange]);

    // get new range
    const startDate = timelineTicks[section]
    const endDate = timelineTicks[(section + 1)]
    setTimelineRange([startDate, endDate])

    // filter events
    getEventsInView()    
  }

  function handleBackClick() {
    const newRangeStack = [...rangeStack]

    if (newRangeStack.length === 0) {return}

    const priorRange = newRangeStack.pop()

    console.log("pressed back")
    setRangeStack(newRangeStack)
    setTimelineRange(priorRange)
  }


  // on load calculate base stats of timeline
  // this should run once on page load, when data is recieved
  useEffect(() => {
    if (data && data.relationships) {

      // parse json data into list of events
      createEventList(data.relationships)
    }
  }, [data])

  useEffect(() => {
    if (eventList.length > 0) {
      getInitialTimelineRange();
    }
  }, [eventList]);

  // when the range is updated, get the date ticks!
  // also set events in view based on range
  useEffect(() => {
    // TODO get the date ticks
    getTimelineTicks()
    getEventsInView()
  }, [timelineRange])

  // useEffect(() => {
  //   console.log("timeline ticks: ", timelineTicks)
  // }, [timelineTicks]) 

  // used to resize ui on page size change
  useEffect(() => {
    
    handleResize()
    

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [])

  // also updates ui
  useEffect(() => {
    // Update the ticks based on the margin list
    const newTicks = marginList.map((margin, index) => (
      <div className="sub-tick" key={index} style={{ marginLeft: `${margin}px` }}></div>
    ));
    setTicks(newTicks);
  }, [marginList]);

  useEffect(() => {
    const backButton = document.getElementById('backButton')
    if (rangeStack.length === 0) {
      // hide back button
      backButton.style.display = 'none'
    } else {
      // show back button
      backButton.style.display = 'block'
    }
  }, [rangeStack])

  // when the width of the timeline changes, replace events on timeline!
  // when the eventsInView Change, replace events on timeline
  useEffect(() => {
    if (timelineRange.length === 0) { return }

    const startDate = timelineRange[0]
    const endDate = timelineRange[1]

    const timelineRangeEvent = new Event(startDate, endDate, "", "")

    console.log("===============")
    eventsInView.forEach((ev) => {

      const evOffsets = timelineRangeEvent.getEventPlacement(ev)
      console.log(ev)
      console.log(evOffsets)
    })

  }, [timelineWidth, eventsInView])

  // TODO add buttons to zoom in/out ->
    /* 
      button should filter all events based on the date tick range
      then set events in current view to the filtered list which causes the useEffect chain to trigger
      range should also be pushed to rangeStack so you can back up and out

      when zooming out, pop range from stack and filter events then set events in view as before
    */

  // helper dispaly component function
  function TimelineTick({eventDate, isFirstTick = false }) {

    if (!eventDate) {return}

    if (isFirstTick) {
      return (
        <div className="first-tick">
          {(eventDate.year < 0) ?  <div className='f-inner-tick'>{(eventDate.year * -1).toLocaleString()} BCE</div> : <div className='f-inner-tick'>{(eventDate.year)} CE</div>}
        </div>
        
      )
    } else {
      return (
        <div className="timeline-tick">
          {(eventDate.year < 0) ?  <div className='inner-tick'>{(eventDate.year * -1).toLocaleString()} BCE</div> : <div className='inner-tick'>{(eventDate.year)} CE</div>}
        </div>
      )
    }
  }

  return (
    <div className='timeline-background'>
      <button 
        id='backButton' 
        className='back-button'
        onClick={() => handleBackClick()}
      />
      <div className="timeline-container">
        
        <button ref={timelineRef} className="sub-timeline-container" onClick={() => handleSubTimelineClick(0)}>
          <TimelineTick eventDate={timelineTicks[0]} isFirstTick={true}/>
          <div className="center-line"/>
          <div className="startcap"/>
          {ticks}
          <div className="endcap"/>
          <TimelineTick eventDate={timelineTicks[1]}/>
        </button>
        
        <button className="sub-timeline-container" onClick={() => handleSubTimelineClick(1)}>
          <div className="center-line"/>
          {ticks}
          <div className="endcap"/>
          <TimelineTick eventDate={timelineTicks[2]}/>
        </button>
        
        <button className="sub-timeline-container" onClick={() => handleSubTimelineClick(2)}>
          <div className="center-line"/>
          {ticks}
          <div className="endcap"/>
          <TimelineTick eventDate={timelineTicks[3]}/>
        </button>
        
        <button className="sub-timeline-container" onClick={() => handleSubTimelineClick(3)}>
          <div className="center-line"/>
          {ticks}
          <div className="endcap"/>
          <TimelineTick eventDate={timelineTicks[4]}/>
        </button>
      
      </div>
    </div>
  );
}