  import React, { useState } from 'react'
  import '../styles/TimelineEvent.css'
  import bracket from '../assets/bracket.svg'

  import { useNavigate } from 'react-router-dom';
  
  

  


  // TODO:
  // make range graphic
    // use an svg and scale it?
  // figure out how to stop overlap stuff
  // get ticks to display times other than years
  export default function TimelineEvent({layer, ev, offsets, timelineWidth}) {

    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
        setClicked(!clicked);
    }


    if (!offsets) {
      return null
    }

    // get event offset pixel values
    const e1Offset = offsets[0] * timelineWidth - 17
    const e2Offset = offsets[1] * timelineWidth - 17

    // determine if range to display

    if (!ev.isRange()) {


        return (
            <div className='timeline-event-container' style={{zIndex: layer}}>
                <div
                    className={`event-button ${clicked ? 'clicked' : ''}`}
                    style={{left: `${e1Offset}px`}}
                    onClick={handleClick}
                >   
                    {!clicked && (
                        <div className='event-line'>

                        </div>
                    )}
                    {clicked && (
                        <button className='event-name' onClick={() => window.open(`/markdown/${ev.parent}/${ev.fileName}`, '_blank')}>
                            {ev.eventName}
                        </button>
                    )}
                </div>
            </div>
        )



    } else {
        return (
            <img className='bracket-svg' src={bracket}/>
        )
      return (
        <div className='timeline-event-container'>
          <button className='timeline-event' style={{left: `${e1Offset}px`}}>
            <div className='timeline-event-name'>{ev.eventName}</div>
          </button>
          <button className='timeline-event' style={{left: `${e2Offset}px`}}>
            <div className='timeline-event-name'>{ev.eventName}</div>
          </button>
        </div>
      )
    }
}