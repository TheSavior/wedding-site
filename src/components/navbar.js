import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"

const NavBar = () => (
  <div>
    <Link to="/">Home</Link>
    <Link to="/rsvp">RSVP</Link>
    <Link to="/login">Login</Link>
  </div>
)

export default NavBar
