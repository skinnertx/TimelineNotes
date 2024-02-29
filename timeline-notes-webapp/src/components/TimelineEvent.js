  import React, { useEffect, useState } from 'react'
  import '../styles/TimelineEvent.css'

  import { useNavigate } from 'react-router-dom';

  function EventRangeGraphic({bracketWidth, leftOffset, heightOffset, isClicked}) {

    return (
      <div 
        className='event-range' 
        style={{left: leftOffset, 
                width: bracketWidth,
                bottom: `${heightOffset}vh`,
                borderColor: isClicked ? `#FFBE0B` : `#338`,
              }}/>
    )
  }
  

  // TODO:
  // make range graphic
    // use an svg and scale it?
  // figure out how to stop overlap stuff
  // get ticks to display times other than years
  export default function TimelineEvent({layer, ev, offsets, timelineWidth, rangeHeight, isClicked=false}) {

    const [clicked, setClicked] = useState(isClicked);

    useEffect(() => {
      setClicked(isClicked)
    }, [isClicked])

    const handleClick = () => {
        setClicked(!clicked);
    }

    if (!offsets) {
      return null
    }

    // get event offset pixel values
    let e1Offset = offsets[0] * timelineWidth - 17
    const e2Offset = offsets[1] * timelineWidth - 17

    
    e1Offset = e1Offset < 0 ? 0 : e1Offset
    const rangeWidth = e2Offset - e1Offset

    // determine if range to display

    if (!ev.isRange()) {

        return (
            <div className='timeline-event-container' >
                <div
                    className={`event-button ${clicked ? 'clicked' : ''}`}
                    style={{left: `${e1Offset}px`}}
                    onClick={handleClick}
                >   
                    {clicked && (
                        <button 
                          className='event-name' 
                          onClick={() => window.open(`/markdown/${ev.parent}/${ev.fileName}`, '_blank')}
                          style={{zIndex: 3}}
                        >
                          <div style={{zIndex: 3}}>{ev.eventName}</div>
                          <div style={{zIndex: 3}}>{ev.startDate.year}</div>
                            
                        </button>
                    )}
                    {!clicked && (
                        <div className='event-line'/>
                    )}

                </div>
            </div>
        )



    } else {

      // TODO split displaying ranges and buttons, ranges go first!

      return (
        <div className='timeline-event-container' >
          
          <div style={{zIndex: 0}}>
            <EventRangeGraphic 
              bracketWidth={rangeWidth} 
              leftOffset={e1Offset}
              heightOffset={rangeHeight + 14.5}
              isClicked={clicked}
            />
          </div>
          <div className='range-button-container' style={{top: `-${rangeHeight+4}vh`, zIndex: 3}}>
            <div
                className={`event-button ${clicked ? 'clicked' : ''}`}
                style={{left: `${((e2Offset + e1Offset) / 2) - 8}px`, zIndex: 3}}
                onClick={handleClick}
            >   
                {clicked && (
                    <button 
                      className='event-name' 
                      onClick={() => window.open(`/markdown/${ev.parent}/${ev.fileName}`, '_blank')}
                      style={{zIndex: 3}}
                    >
                        <div >{ev.eventName}</div>
                        <div >{ev.startDate.year} to {ev.endDate.year}</div>
                    </button>
                )}

                  
                
            </div>
          </div>

        </div>
      )
    }
}