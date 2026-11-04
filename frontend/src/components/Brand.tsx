/** Shared brand lockup; the adjacent wordmark provides the accessible name. */
export function Brand() {
  return (
    <>
      <img
        className="brand-logo"
        src={`${import.meta.env.BASE_URL}credisure.webp`}
        alt=""
        width={40}
        height={40}
      />
      <span>
        CrediSure<span className="brand-period">.</span>
      </span>
    </>
  )
}
