import * as React from "react"

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const userAgentData = window.navigator as Navigator & {
    userAgentData?: { mobile?: boolean }
  }
  const isNarrowViewport =
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches ||
    viewportWidth < MOBILE_BREAKPOINT ||
    window.innerWidth < MOBILE_BREAKPOINT
  const isMobileUserAgent =
    /Android|iPhone|iPod|Mobile/i.test(window.navigator.userAgent) ||
    userAgentData.userAgentData?.mobile === true

  return isNarrowViewport || isMobileUserAgent
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(getIsMobile())
    }

    mql.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    window.visualViewport?.addEventListener("resize", onChange)
    setIsMobile(getIsMobile())

    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
      window.visualViewport?.removeEventListener("resize", onChange)
    }
  }, [])

  return !!isMobile
}
