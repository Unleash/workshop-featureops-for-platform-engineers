# Drop ONLY the provider's benign "Resource Not Deleted" warning for unleash_project_access on
# destroy (the projectAccess is removed from state but intentionally not deleted — the project
# teardown handles it). Every other line — other warnings, errors, plan/apply text — passes through
# untouched.
#
# Each terraform diagnostic is a box drawn between ╷ (top border) and ╵ (bottom border), with the
# title on the line right after the top border. Warnings AND errors both render as boxes, so we key
# strictly on the title: we buffer one box at a time and discard the WHOLE box — borders included —
# only when that title line is "Warning: Resource Not Deleted". Every other box is printed verbatim.
#
# Terraform colorizes diagnostics, so the real border line is "<ESC>[31m╷<ESC>[0m", not a literal
# leading "╷". We therefore match against an ANSI-stripped, trimmed COPY of each line (clean()),
# while buffering/printing the ORIGINAL line so non-suppressed boxes keep their color.
function clean(s) {
          gsub(/\033\[[0-9;]*[A-Za-z]/, "", s)   # strip ANSI/CSI escape sequences (e.g. color)
          gsub(/^[ \t]+|[ \t]+$/, "", s)         # trim surrounding whitespace
          return s
        }
        { c = clean($0) }                        # cleaned copy used only for matching
c ~ /^╷/ { buf = $0; inbox = 1; title = ""; next }
inbox    {
          buf = buf ORS $0
          if (title == "") title = c             # the line right after ╷ is the box title
          if (c ~ /^╵/) {
            if (title !~ /Warning: Resource Not Deleted/) print buf
            inbox = 0; buf = ""
          }
          next
        }
        { print }
