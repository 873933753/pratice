/* 
受控组件和非受控组件
受控组件：数据由state管理，必须由onChange触发 -- 值受state控制
非受控组件：表单数据由DOM自身管理，通过ref从DOM节点取值，无需onChange（适合表单简单，一次性取值）-- 值不受state控制
选择：必须要操作DOM时，再使用非受控组件
*/

import { useRef, useState, type Ref } from 'react'
import ReactDOM from 'react-dom';

export default function ControllCmp(){
  const inputRef = useRef(null)
  const [value,setValue] = useState('')

  /* 非受控组件获取值必须通过获取DOM节点 */
  const handleClick = () => {
    const unCountroll = inputRef.current
    console.log('非受控组件value:'+ unCountroll.value)
  }
  return(
    <div>
      {/* 受控组件 */}
      <p>{value}</p>
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)}  />
      {/* 非受控组件 */}
      <input defaultValue={123} ref={inputRef} />
      <button onClick={handleClick}>alertName</button>
      {/* 可以将组件渲染到目标节点，如弹窗model渲染到body */}
      {
        ReactDOM.createPortal(
          <div>
            createPortal11
          </div>,
          document.body
        )
      }
    </div>
  )
}