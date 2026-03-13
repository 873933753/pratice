import { useState } from 'react'
import StateCmp from './state_1'
import ControllCmp from './controlled'

export default function TestCmp(){
  return(
    <div>
      {/* <StateCmp /> */}
      <ControllCmp />
    </div>
  )
}