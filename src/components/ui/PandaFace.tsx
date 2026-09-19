export default function PandaFace({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/panda.png"
      alt="PandaHub"
      width={size}
      height={size}
      className="rounded-full object-cover select-none shrink-0"
      draggable={false}
    />
  )
}
