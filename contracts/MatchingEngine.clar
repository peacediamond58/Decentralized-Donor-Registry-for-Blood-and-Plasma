(define-constant ERR-NO-MATCH u100)
(define-constant ERR-INVALID-BLOOD-TYPE u101)
(define-constant ERR-INVALID-LOCATION u102)
(define-constant ERR-INVALID-RADIUS u103)
(define-constant ERR-DONOR-NOT-FOUND u104)
(define-constant ERR-NEED-NOT-FOUND u105)
(define-constant ERR-ALREADY-MATCHED u106)
(define-constant ERR-INVALID-URGENCY u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-NOT-AUTHORIZED u109)
(define-constant ERR-INVALID-STATUS u110)
(define-constant ERR-MAX-MATCHES_EXCEEDED u111)
(define-constant ERR-INVALID-DONOR-STATUS u112)
(define-constant ERR-INVALID-NEED-STATUS u113)
(define-constant ERR-INVALID-PRIORITY u114)
(define-constant ERR-INVALID-QUANTITY u115)
(define-constant ERR-INVALID-COMPATIBILITY u116)
(define-constant ERR-AUTHORITY-NOT-SET u117)
(define-constant ERR-INVALID-AUTHORITY u118)
(define-constant ERR-INVALID-MATCH-ID u119)
(define-constant ERR-MATCH-ALREADY-EXISTS u120)

(define-data-var last-match-id uint u0)
(define-data-var max-matches uint u10000)
(define-data-var match-fee uint u100)
(define-data-var authority-contract (optional principal) none)

(define-map Matches
  { match-id: uint }
  {
    donor-principal: principal,
    need-id: uint,
    blood-type: (string-ascii 3),
    location: (string-ascii 50),
    radius: uint,
    urgency: uint,
    timestamp: uint,
    status: bool,
    priority: uint,
    quantity: uint
  }
)

(define-map DonorMatches
  { donor-principal: principal }
  (list 50 uint)
)

(define-map NeedMatches
  { need-id: uint }
  (list 50 uint)
)

(define-read-only (get-match (id uint))
  (map-get? Matches { match-id: id })
)

(define-read-only (get-donor-matches (donor principal))
  (default-to (list) (map-get? DonorMatches { donor-principal: donor }))
)

(define-read-only (get-need-matches (need uint))
  (default-to (list) (map-get? NeedMatches { need-id: need }))
)

(define-read-only (is-match-active (id uint))
  (match (get-match id)
    m (get status m)
    false
  )
)

(define-private (validate-blood-type (bt (string-ascii 3)))
  (if (or (is-eq bt "A+") (is-eq bt "A-") (is-eq bt "B+") (is-eq bt "B-")
          (is-eq bt "O+") (is-eq bt "O-") (is-eq bt "AB+") (is-eq bt "AB-"))
    (ok true)
    (err ERR-INVALID-BLOOD-TYPE)
  )
)

(define-private (validate-location (loc (string-ascii 50)))
  (if (and (> (len loc) u0) (<= (len loc) u50))
    (ok true)
    (err ERR-INVALID-LOCATION)
  )
)

(define-private (validate-radius (rad uint))
  (if (and (> rad u0) (<= rad u1000))
    (ok true)
    (err ERR-INVALID-RADIUS)
  )
)

(define-private (validate-urgency (urg uint))
  (if (<= urg u10)
    (ok true)
    (err ERR-INVALID-URGENCY)
  )
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
    (ok true)
    (err ERR-INVALID-TIMESTAMP)
  )
)

(define-private (validate-status (st bool))
  (ok true)
)

(define-private (validate-priority (pri uint))
  (if (<= pri u5)
    (ok true)
    (err ERR-INVALID-PRIORITY)
  )
)

(define-private (validate-quantity (qty uint))
  (if (> qty u0)
    (ok true)
    (err ERR-INVALID-QUANTITY)
  )
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
    (ok true)
    (err ERR-NOT-AUTHORIZED)
  )
)

(define-private (check-compatibility (donor-bt (string-ascii 3)) (need-bt (string-ascii 3)))
  (if (or (is-eq donor-bt need-bt)
          (and (is-eq donor-bt "O-") true)
          (and (is-eq donor-bt "O+") (or (is-eq need-bt "O+") (is-eq need-bt "A+") (is-eq need-bt "B+") (is-eq need-bt "AB+")))
          (and (is-eq donor-bt "A-") (or (is-eq need-bt "A-") (is-eq need-bt "A+") (is-eq need-bt "AB-") (is-eq need-bt "AB+")))
          (and (is-eq donor-bt "A+") (or (is-eq need-bt "A+") (is-eq need-bt "AB+")))
          (and (is-eq donor-bt "B-") (or (is-eq need-bt "B-") (is-eq need-bt "B+") (is-eq need-bt "AB-") (is-eq need-bt "AB+")))
          (and (is-eq donor-bt "B+") (or (is-eq need-bt "B+") (is-eq need-bt "AB+")))
          (and (is-eq donor-bt "AB-") (or (is-eq need-bt "AB-") (is-eq need-bt "AB+")))
          (and (is-eq donor-bt "AB+") (is-eq need-bt "AB+")))
    (ok true)
    (err ERR-INVALID-COMPATIBILITY)
  )
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-matches (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-RADIUS))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set max-matches new-max)
    (ok true)
  )
)

(define-public (set-match-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-QUANTITY))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set match-fee new-fee)
    (ok true)
  )
)

(define-public (create-match
  (donor principal)
  (need uint)
  (blood-type (string-ascii 3))
  (location (string-ascii 50))
  (radius uint)
  (urgency uint)
  (priority uint)
  (quantity uint)
  (need-bt (string-ascii 3))
)
  (let (
    (next-id (var-get last-match-id))
    (current-max (var-get max-matches))
    (authority (var-get authority-contract))
  )
    (asserts! (< next-id current-max) (err ERR-MAX-MATCHES_EXCEEDED))
    (try! (validate-blood-type blood-type))
    (try! (validate-location location))
    (try! (validate-radius radius))
    (try! (validate-urgency urgency))
    (try! (validate-priority priority))
    (try! (validate-quantity quantity))
    (try! (check-compatibility blood-type need-bt))
    (asserts! (is-none (index-of? (get-donor-matches donor) next-id)) (err ERR-ALREADY-MATCHED))
    (asserts! (is-none (index-of? (get-need-matches need) next-id)) (err ERR_ALREADY-MATCHED))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-SET))))
      (try! (stx-transfer? (var-get match-fee) tx-sender authority-recipient))
    )
    (map-set Matches { match-id: next-id }
      {
        donor-principal: donor,
        need-id: need,
        blood-type: blood-type,
        location: location,
        radius: radius,
        urgency: urgency,
        timestamp: block-height,
        status: true,
        priority: priority,
        quantity: quantity
      }
    )
    (map-set DonorMatches { donor-principal: donor }
      (unwrap! (as-max-len? (append (get-donor-matches donor) next-id) u50) (err ERR-MAX-MATCHES_EXCEEDED))
    )
    (map-set NeedMatches { need-id: need }
      (unwrap! (as-max-len? (append (get-need-matches need) next-id) u50) (err ERR-MAX-MATCHES_EXCEEDED))
    )
    (var-set last-match-id (+ next-id u1))
    (print { event: "match-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-match-status (match-id uint) (new-status bool))
  (let ((match (map-get? Matches { match-id: match-id })))
    (match match
      m
      (begin
        (asserts! (is-eq (get donor-principal m) tx-sender) (err ERR-NOT-AUTHORIZED))
        (try! (validate-status new-status))
        (map-set Matches { match-id: match-id }
          (merge m { status: new-status, timestamp: block-height })
        )
        (print { event: "match-updated", id: match-id })
        (ok true)
      )
      (err ERR-INVALID-MATCH-ID)
    )
  )
)

(define-public (get-match-count)
  (ok (var-get last-match-id))
)