import React, { useState, useReducer, useEffect } from 'react';

import SEO from '../components/seo';
import GetUpdatesSection from '../components/getUpdatesSection';
import ComingSoon from '../components/comingSoon';
import RSVP_GROUP_DATA from './rsvp_data.json';

import { withPrivateRoute } from '../components/privateRoute';

const URL =
  'https://script.google.com/macros/s/AKfycbytK-1S588_Z4M4MzV8M-nlyHKNargj6EXwtmPfIO3gZ-CpMBJo-3kEdDWj0wmZYqWhIw/exec';
const SHOW_RSVP = true;

/*
thoughts

matching lower case names. Fuzzy?
Check if already submitted from google sheet?
Email validation?
*/

function useInput() {
  const [value, setValue] = useState('');
  const input = (
    <input type="text" onChange={e => setValue(e.target.value)} value={value} />
  );

  return [value, input];
}

function findGroup(name) {
  return RSVP_GROUP_DATA.find(group => {
    return group.names
      .map(name => name.toLowerCase())
      .includes(name.toLowerCase());
  });
}

const RSVPPage = () => {
  const content = SHOW_RSVP ? (
    <RSVPForm />
  ) : (
    <>
      <h3 className="cursive">Can't Attend?</h3>
      <div className="caps-subheader accent">We're going to miss you!</div>
      <p>
        It will greatly help with our planning to know if you are unable to
        attend. If you already know about a conflict kindly send your regrets
        via email to{' '}
        <a className="accent" href="mailto:hollyandeli@gmail.com">
          hollyandeli@gmail.com
        </a>
        .
      </p>
      <p>
        Excited to let us know you’re coming, or still unsure of your plans?
        You’ve still got time to figure it out - online RSVP will open at a
        later date.
      </p>

      <h3 className="cursive">RSVP</h3>
      <ComingSoon />
    </>
  );

  return (
    <>
      <SEO title="RSVP" />
      <div className="section">
        <div className="section-container narrow-column">{content}</div>
      </div>
      {SHOW_RSVP ? null : <GetUpdatesSection />}
    </>
  );
};

function RSVPForm() {
  const [rsvpGroup, setRsvpGroup] = useState(null);
  const [previouslySubmitted, setPreviouslySubmitted] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (rsvpGroup == null) {
    return (
      <FindNameOnGuestList
        onGroupFound={(group, alreadySubmitted) => {
          setPreviouslySubmitted(alreadySubmitted);
          setRsvpGroup(group);
        }}
      />
    );
  } else if (previouslySubmitted) {
    return <AlreadySubmitted />;
  } else if (submitted) {
    return <RSVPSubmittedSuccessfully />;
  } else {
    console.log('enter details', rsvpGroup);
    return (
      <EnterDetails
        group={rsvpGroup}
        onSubmit={() => {
          setSubmitted(true);
        }}
      />
    );
  }
}

function FindNameOnGuestList({ onGroupFound }) {
  const [name, nameInput] = useInput();
  const [group, setGroup] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(null);

  useEffect(() => {
    let expired = false;

    function reportAlreadySubmitted(alreadySubmitted) {
      if (expired) {
        return;
      }

      expired = true;
      onGroupFound(group, alreadySubmitted);
      setFetchingStatus(false);
    }
    if (fetchingStatus === true) {
      const name = group.names[0];

      fetch(
        `${URL}?` +
          new URLSearchParams({
            name,
          })
      )
        .then(res => res.json())
        .then(result => {
          if (result.error) {
            console.error(
              'Received an error when looking up the RSVP status for',
              name,
              result.error
            );
            reportAlreadySubmitted(false);
          } else if (result.alreadySubmitted == null) {
            console.error('Failed to look up RSVP status for', name);
            reportAlreadySubmitted(false);
          } else {
            reportAlreadySubmitted(result.alreadySubmitted);
          }
        });
    }

    const timer = setTimeout(() => {
      reportAlreadySubmitted(false);

      expired = true;
    }, 15 * 1000);

    return () => {
      expired = true;
      clearTimeout(timer);
    };
  }, [fetchingStatus, group, onGroupFound]);

  const handleSubmit = event => {
    event.preventDefault();

    const group = findGroup(name);

    if (group == null) {
      setGroup(false);
    } else {
      setGroup(group);
      setFetchingStatus(true);
    }
  };

  return (
    <>
      <h3>Name</h3>
      <form onSubmit={handleSubmit}>
        {group === false ? (
          <>
            <h3>Name not found on the guest list</h3>
            <p>
              If you this is in error{' '}
              <a href="mailto:hollyandeli@gmail.com">email us.</a>
            </p>
          </>
        ) : null}
        <div>{nameInput}</div>

        <input
          type="submit"
          value="Submit"
          disabled={fetchingStatus === true}
        />
        {fetchingStatus && 'spinner'}
      </form>
    </>
  );
}

function EnterDetails({ group, onSubmit }) {
  const [state, dispatch] = useReducer(
    (state, action) => {
      if (action.type === 'attending') {
        return {
          ...state,
          people: state.people.map(person => {
            return {
              ...person,
              attending:
                person.name === action.name ? action.value : person.attending,
            };
          }),
        };
      } else if (action.type === 'guest-attending') {
        return {
          ...state,
          guests: state.guests.map(guest => {
            return {
              ...guest,
              attending:
                guest.guestIndex === action.guestIndex
                  ? action.value
                  : guest.attending,
            };
          }),
        };
      } else if (action.type === 'guest-name') {
        return {
          ...state,
          guests: state.guests.map(guest => {
            return {
              ...guest,
              name:
                guest.guestIndex === action.guestIndex
                  ? action.name
                  : guest.name,
            };
          }),
        };
      } else if (action.type === 'group-email') {
        return {
          ...state,
          groupEmail: action.value,
        };
      } else {
        throw new Error('unexpected action', action.type);
      }
    },
    {
      groupEmail: null,
      people: group.names.map(name => {
        return {
          name,
          attending: false,
        };
      }),
      guests:
        group.guests == null
          ? []
          : new Array(group.guests).fill(null).map((_, guestIndex) => {
              return {
                guestIndex,
                name: null,
                attending: false,
              };
            }),
    }
  );

  console.log('state', JSON.stringify(state));

  function handleSubmit(event) {
    event.preventDefault();

    // These are entered into the spreadsheet with columns matching key
    const spreadSheetData = state.people
      .map(person => ({
        name: person.name,
        groupEmail: state.groupEmail,
        attending: person.attending ? 'yes' : 'no',
      }))
      .concat(
        state.guests.map(guest => ({
          name: guest.name,
          groupEmail: state.groupEmail,
          attending: guest.attending ? 'yes' : 'no',
          guestOf: state.people[0].name,
        }))
      );

    fetch(URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spreadSheetData),
    });

    onSubmit();
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div>
          <h3>Enter an email we can use to reach your group</h3>
          <input
            type="email"
            onBlur={e => {
              dispatch({
                type: 'group-email',
                value: e.target.value,
              });
            }}
          />
        </div>
        {state.people.map(person => {
          return (
            <div key={person.name}>
              <p>{person.name}</p>
              <label>
                Attending
                <input
                  type="checkbox"
                  checked={person.attending}
                  onChange={e => {
                    dispatch({
                      type: 'attending',
                      name: person.name,
                      value: e.target.checked,
                    });
                  }}
                />
              </label>
            </div>
          );
        })}

        {state.guests.map(guest => {
          return (
            <div key={guest.guestIndex}>
              <input
                type="text"
                value={guest.name || ''}
                placeholder="Guest Name"
                onChange={e => {
                  dispatch({
                    type: 'guest-name',
                    guestIndex: guest.guestIndex,
                    name: e.target.value,
                  });
                }}
              />
              <label>
                Attending
                <input
                  type="checkbox"
                  checked={guest.attending}
                  onChange={e => {
                    dispatch({
                      type: 'guest-attending',
                      guestIndex: guest.guestIndex,
                      value: e.target.checked,
                    });
                  }}
                />
              </label>
            </div>
          );
        })}
        {}
        <input type="submit" value="Submit" />
      </form>
    </>
  );
}

function AlreadySubmitted() {
  return (
    <>
      <h3>RSVP Already Submitted</h3>
      <p>
        We already have an RSVP on file for you. If you need to change it,
        please email us.
      </p>
    </>
  );
}

function RSVPSubmittedSuccessfully() {
  return (
    <>
      <h3>Success</h3>
      <p>
        Thank you for RSVPing. Email us if you'd like to make any modifications
        to your RSVP.
      </p>
    </>
  );
}

export default withPrivateRoute(RSVPPage);
