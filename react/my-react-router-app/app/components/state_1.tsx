import { useState } from 'react'

export default function StateCmp(){
  const [ count, setCount ] = useState(0)
  const handleClick = () => {
    /* 
     这里的 value 始终是 0（当前闭包中的值），所以相当于三次setCount(1)
     最终react只会执行最后一次
    */
    setCount(count+1)
    setCount(count+1)
    setCount(count+1)  // 3个setCount却只执行了一次
    console.log(count) // 页面显示1，但是打印0
  }
  /* 函数式不会被合并 ，prev 是上一次更新后的最新值 +3 */
  const handleClick2 = () => {
    setCount((prev) => {
      return prev + 1
    })
    setCount((prev) => {
      return prev + 1
    })
    setCount((prev) => {
      return prev + 1
    })
  }
  return(
    <div>
      {count}
      <button onClick={handleClick2}>add</button>
    </div>
  )
}