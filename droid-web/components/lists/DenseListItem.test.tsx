import { render, screen, fireEvent } from "@testing-library/react"
import { DenseListItem } from "./DenseListItem"

describe("DenseListItem", () => {
  it("renders children", () => {
    render(
      <DenseListItem selected={false} onClick={jest.fn()}>
        <span>Item content</span>
      </DenseListItem>
    )
    expect(screen.getByText("Item content")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const onClick = jest.fn()
    render(
      <DenseListItem selected={false} onClick={onClick}>
        content
      </DenseListItem>
    )
    fireEvent.click(screen.getByText("content"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("applies selected styles when selected=true", () => {
    const { container } = render(
      <DenseListItem selected={true} onClick={jest.fn()}>
        content
      </DenseListItem>
    )
    const item = container.firstChild as HTMLElement
    expect(item).toHaveStyle({ background: "var(--selection-bg)" })
  })

  it("does not apply selected styles when selected=false", () => {
    const { container } = render(
      <DenseListItem selected={false} onClick={jest.fn()}>
        content
      </DenseListItem>
    )
    const item = container.firstChild as HTMLElement
    expect(item).not.toHaveStyle({ background: "var(--selection-bg)" })
  })
})
