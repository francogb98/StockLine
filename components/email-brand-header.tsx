interface EmailBrandHeaderProps {
  showText?: boolean
}

export function EmailBrandHeader({ showText = true }: EmailBrandHeaderProps) {
  return (
    <table
      align="center"
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      style={{
        marginBottom: "24px",
      }}
    >
      <tr>
        <td align="center">
          {showText ? (
            <table cellPadding="0" cellSpacing="0" role="presentation">
              <tr>
                <td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
                  <img
                    src="https://stockline.app/icon.png"
                    alt=""
                    width="28"
                    height="28"
                    style={{ display: "block" }}
                  />
                </td>
                <td
                  style={{
                    verticalAlign: "middle",
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0F172A",
                    letterSpacing: "-0.02em",
                  }}
                >
                  StockLine
                </td>
              </tr>
            </table>
          ) : (
            <img
              src="https://stockline.app/icon.png"
              alt="StockLine"
              width="40"
              height="40"
              style={{ display: "block" }}
            />
          )}
        </td>
      </tr>
    </table>
  )
}
