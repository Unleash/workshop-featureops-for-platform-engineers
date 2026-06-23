# Drop ONLY the provider's benign "Resource Not Deleted" warning for unleash_project_access on
# destroy (the projectAccess is removed from state but intentionally not deleted — the project
# teardown handles it). Every other line — other warnings, errors, plan/apply text — passes through
# untouched. Each terraform diagnostic is a box drawn between ╷ and ╵; we buffer one box at a time and
# only suppress it when its body names both this warning and projectAccess.
/^╷/    { buf = $0; inbox = 1; next }
inbox   {
          buf = buf ORS $0
          if ($0 ~ /^╵/) {
            if (buf !~ /Warning: Resource Not Deleted/ || buf !~ /projectAccess/) print buf
            inbox = 0; buf = ""
          }
          next
        }
        { print }
