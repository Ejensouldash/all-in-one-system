import React from "react"
import { Text, View, StyleSheet } from "@react-pdf/renderer"
import { nrhoPalette } from "./nrho-pdf-utils"

/**
 * Minimal markdown renderer for react-pdf, styled like the Aria chatbot:
 * bold labels, diamond bullets and numbered badges, with no raw ** / ### symbols.
 */

const ACCENT = "#6366F1"

const styles = StyleSheet.create({
  heading: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginTop: 6,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 7.5,
    color: nrhoPalette.body,
    lineHeight: 1.45,
    marginBottom: 5,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3.5,
  },
  bulletCell: {
    width: 12,
    paddingTop: 3.2,
  },
  bullet: {
    width: 3.6,
    height: 3.6,
    backgroundColor: ACCENT,
    borderRadius: 0.8,
    transform: "rotate(45deg)",
    marginLeft: 1,
  },
  badgeCell: {
    width: 15,
  },
  badge: {
    width: 10,
    height: 10,
    backgroundColor: ACCENT,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 5.8,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  listText: {
    flex: 1,
    fontSize: 7.5,
    color: nrhoPalette.body,
    lineHeight: 1.45,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
  },
})

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; num: string; text: string }

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join("\n") })
      paragraph = []
    }
  }

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim()

    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      flushParagraph()
      blocks.push({ type: "heading", text: heading[1] })
      continue
    }

    const bullet = line.match(/^[*\-•+]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      blocks.push({ type: "bullet", text: bullet[1] })
      continue
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      blocks.push({ type: "numbered", num: numbered[1], text: numbered[2] })
      continue
    }

    paragraph.push(line)
  }
  flushParagraph()

  return blocks
}

/** Strip leftover markdown symbols (italics, inline code, stray asterisks). */
function cleanText(text: string): string {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*([^*\s][^*]*)\*/g, "$1")
    .replace(/(^|\s)_([^_\s][^_]*)_(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/\*/g, "")
}

/** Render a line, turning **bold** / __bold__ into Helvetica-Bold spans. */
function renderInline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__)/g)
    .filter((part) => part.length > 0)
    .map((part, i) => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/)
      if (bold) {
        return (
          <Text key={i} style={styles.bold}>
            {cleanText(bold[1])}
          </Text>
        )
      }
      return cleanText(part)
    })
}

export function PdfMarkdown({ markdown }: { markdown: string }) {
  return (
    <>
      {parseBlocks(markdown).map((block, idx) => {
        switch (block.type) {
          case "heading":
            return (
              <Text key={idx} style={styles.heading}>
                {cleanText(block.text.replace(/\*\*/g, ""))}
              </Text>
            )
          case "bullet":
            return (
              <View key={idx} style={styles.listRow} wrap={false}>
                <View style={styles.bulletCell}>
                  <View style={styles.bullet} />
                </View>
                <Text style={styles.listText}>{renderInline(block.text)}</Text>
              </View>
            )
          case "numbered":
            return (
              <View key={idx} style={styles.listRow} wrap={false}>
                <View style={styles.badgeCell}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{block.num}</Text>
                  </View>
                </View>
                <Text style={styles.listText}>{renderInline(block.text)}</Text>
              </View>
            )
          default:
            return (
              <Text key={idx} style={styles.paragraph}>
                {renderInline(block.text)}
              </Text>
            )
        }
      })}
    </>
  )
}
