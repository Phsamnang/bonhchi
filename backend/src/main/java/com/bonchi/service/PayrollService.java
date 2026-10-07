package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.dto.PayrollDto;
import com.bonchi.entity.*;
import com.bonchi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PayrollService {

    private final StaffRepository staffRepository;
    private final StaffContractRepository staffContractRepository;
    private final StaffAdvanceRepository advanceRepository;
    private final PayrollRunRepository payrollRunRepository;
    private final PayrollItemRepository payrollItemRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final InvoiceRepository invoiceRepository;
    private final PayrollRepository payrollRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStaff(boolean includeInactive, String userRole) {
        List<Staff> staffList = includeInactive ?
                staffRepository.findAllByOrderByJoinedDateAsc() :
                staffRepository.findByIsActiveTrueOrderByJoinedDateAsc();

        boolean isOwner = "owner".equalsIgnoreCase(userRole);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Staff s : staffList) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId());
            map.put("name", s.getName());
            map.put("phone", s.getPhone());
            map.put("position", s.getPosition());
            map.put("user_id", s.getUserId());
            map.put("joined_date", s.getJoinedDate() != null ? s.getJoinedDate().toString() : null);
            map.put("left_date", s.getLeftDate() != null ? s.getLeftDate().toString() : null);
            map.put("is_active", s.getIsActive());
            map.put("created_at", s.getCreatedAt());

            Optional<StaffContract> contract = staffContractRepository.findLatestByStaffId(s.getId());
            if (isOwner && contract.isPresent()) {
                StaffContract c = contract.get();
                map.put("contract_id", c.getId());
                map.put("salary_type", c.getSalaryType());
                map.put("base_rate", c.getBaseRate());
                map.put("currency", c.getCurrency());
                map.put("standard_days", c.getStandardDays());
                map.put("effective_from", c.getEffectiveFrom() != null ? c.getEffectiveFrom().toString() : null);
            } else {
                map.put("contract_id", null);
                map.put("salary_type", null);
                map.put("base_rate", null);
                map.put("currency", contract.map(StaffContract::getCurrency).orElse("USD"));
                map.put("standard_days", null);
                map.put("effective_from", null);
            }
            result.add(map);
        }

        return result;
    }

    @Transactional
    public Map<String, Object> createStaff(PayrollDto.StaffPayload body, Long userId) {
        if (body.getName() == null || body.getName().isBlank()) {
            throw new IllegalArgumentException("Staff name is required");
        }

        LocalDate joined = body.getJoined_date() != null && !body.getJoined_date().isBlank() ?
                LocalDate.parse(body.getJoined_date()) : TimeUtil.today();

        Staff staff = Staff.builder()
                .name(body.getName().trim())
                .phone(body.getPhone())
                .position(body.getPosition() != null ? body.getPosition().trim() : "Staff")
                .userId(body.getUser_id())
                .joinedDate(joined)
                .isActive(true)
                .build();

        Staff savedStaff = staffRepository.save(staff);

        if (body.getBase_rate() != null) {
            StaffContract contract = StaffContract.builder()
                    .staffId(savedStaff.getId())
                    .salaryType(body.getSalary_type() != null ? body.getSalary_type() : "monthly")
                    .baseRate(body.getBase_rate())
                    .currency(body.getCurrency() != null ? body.getCurrency().toUpperCase() : "USD")
                    .standardDays(body.getStandard_days() != null ? body.getStandard_days() : 26)
                    .effectiveFrom(joined)
                    .createdBy(userId)
                    .build();
            staffContractRepository.save(contract);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("staff", savedStaff);
        return resp;
    }

    @Transactional
    public Map<String, Object> updateStaff(Long id, PayrollDto.StaffPayload body, Long userId) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Staff not found: " + id));

        if (body.getName() != null) staff.setName(body.getName().trim());
        if (body.getPhone() != null) staff.setPhone(body.getPhone());
        if (body.getPosition() != null) staff.setPosition(body.getPosition().trim());
        if (body.getUser_id() != null) staff.setUserId(body.getUser_id());
        if (body.getJoined_date() != null) staff.setJoinedDate(LocalDate.parse(body.getJoined_date()));
        if (body.getLeft_date() != null) staff.setLeftDate(LocalDate.parse(body.getLeft_date()));
        if (body.getIs_active() != null) staff.setIsActive(body.getIs_active());

        staffRepository.save(staff);

        if (body.getBase_rate() != null) {
            StaffContract contract = StaffContract.builder()
                    .staffId(staff.getId())
                    .salaryType(body.getSalary_type() != null ? body.getSalary_type() : "monthly")
                    .baseRate(body.getBase_rate())
                    .currency(body.getCurrency() != null ? body.getCurrency().toUpperCase() : "USD")
                    .standardDays(body.getStandard_days() != null ? body.getStandard_days() : 26)
                    .effectiveFrom(TimeUtil.today())
                    .createdBy(userId)
                    .build();
            staffContractRepository.save(contract);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("staff", staff);
        return resp;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAttendanceForDate(String dateStr) {
        String date = dateStr != null && !dateStr.isBlank() ? dateStr : TimeUtil.getPhnomPenhDate();
        return payrollRepository.getAttendanceForDate(LocalDate.parse(date));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAttendanceRange(String startStr, String endStr) {
        LocalDate start = LocalDate.parse(startStr);
        LocalDate end = LocalDate.parse(endStr);

        List<Map<String, Object>> staff = payrollRepository.getActiveStaffForGrid();
        List<Map<String, Object>> records = payrollRepository.getAttendanceRecordsInRange(start, end);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("start", startStr);
        resp.put("end", endStr);
        resp.put("staff", staff);
        resp.put("records", records);
        return resp;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAttendanceSummary(String startStr, String endStr) {
        LocalDate start = LocalDate.parse(startStr);
        LocalDate end = LocalDate.parse(endStr);
        return payrollRepository.getAttendanceSummary(start, end);
    }

    @Transactional
    public Map<String, Object> saveAttendanceBatch(PayrollDto.AttendanceBatchPayload body, Long userId) {
        String dateStr = body.getDate() != null && !body.getDate().isBlank() ? body.getDate() : TimeUtil.getPhnomPenhDate();
        LocalDate date = LocalDate.parse(dateStr);

        Map<String, BigDecimal> unitMap = Map.of(
                "present", BigDecimal.ONE,
                "half_day", new BigDecimal("0.5"),
                "absent", BigDecimal.ZERO,
                "leave_paid", BigDecimal.ONE,
                "leave_unpaid", BigDecimal.ZERO,
                "holiday_work", new BigDecimal("2.0")
        );

        int count = 0;
        if (body.getRecords() != null) {
            for (PayrollDto.AttendanceRecordItem item : body.getRecords()) {
                String status = item.getStatus() != null ? item.getStatus() : "present";
                BigDecimal units = unitMap.getOrDefault(status, BigDecimal.ONE);
                payrollRepository.upsertAttendanceRecord(item.getStaff_id(), date, status, units, item.getNote(), userId);
                count++;
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("count", count);
        resp.put("date", dateStr);
        return resp;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAdvances(Long staffId, String status, String from, String to) {
        LocalDate fromDate = from != null && !from.isBlank() ? LocalDate.parse(from.trim()) : null;
        LocalDate toDate = to != null && !to.isBlank() ? LocalDate.parse(to.trim()) : null;
        return payrollRepository.findAdvances(staffId, status, fromDate, toDate);
    }

    @Transactional
    public Map<String, Object> createAdvance(PayrollDto.AdvancePayload body, Long userId) {
        if (body.getStaff_id() == null || body.getAmount() == null || body.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("staff_id and positive amount are required");
        }

        LocalDate givenAt = body.getGiven_at() != null && !body.getGiven_at().isBlank() ?
                LocalDate.parse(body.getGiven_at()) : TimeUtil.today();
        String currency = body.getCurrency() != null ? body.getCurrency().toUpperCase() : "USD";

        Staff staff = staffRepository.findById(body.getStaff_id())
                .orElseThrow(() -> new IllegalArgumentException("Staff member not found: " + body.getStaff_id()));

        Wallet wallet = null;
        if (body.getWallet_id() != null) {
            wallet = walletRepository.findByIdForUpdate(body.getWallet_id())
                    .orElseThrow(() -> new IllegalArgumentException("Wallet not found: " + body.getWallet_id()));

            if (!currency.equalsIgnoreCase(wallet.getCurrency())) {
                throw new IllegalArgumentException("Wallet currency (" + wallet.getCurrency() + ") does not match advance currency (" + currency + ")");
            }
            if (wallet.getCurrentBalance().compareTo(body.getAmount()) < 0) {
                throw new IllegalArgumentException("Insufficient wallet balance. Available: " + wallet.getCurrentBalance() + " " + wallet.getCurrency());
            }

            wallet.setCurrentBalance(wallet.getCurrentBalance().subtract(body.getAmount()));
            walletRepository.save(wallet);
        }

        boolean isUsd = "USD".equalsIgnoreCase(currency);
        String invNo = "#ADV-" + (System.currentTimeMillis() % 10000) + (10 + new Random().nextInt(90));

        Invoice invoice = Invoice.builder()
                .invoiceNo(invNo)
                .invoiceDate(givenAt)
                .invoiceTime(TimeUtil.nowTime())
                .type("expense")
                .expenseKind("salary")
                .supplierName(staff.getName())
                .categoryName("បុរេប្រទានប្រាក់ខែ (Staff Advance)")
                .walletCode(wallet != null ? wallet.getCode() : null)
                .totalUsd(isUsd ? body.getAmount() : BigDecimal.ZERO)
                .totalKhr(isUsd ? BigDecimal.ZERO : body.getAmount())
                .paidUsd(isUsd ? body.getAmount() : BigDecimal.ZERO)
                .paidKhr(isUsd ? BigDecimal.ZERO : body.getAmount())
                .status("paid")
                .note(body.getNote() != null && !body.getNote().isBlank() ? body.getNote() : "Salary advance to " + staff.getName())
                .createdBy(userId)
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);

        StaffAdvance advance = StaffAdvance.builder()
                .staffId(body.getStaff_id())
                .amount(body.getAmount())
                .currency(currency)
                .givenAt(givenAt)
                .walletId(wallet != null ? wallet.getId() : null)
                .invoiceId(savedInvoice.getId())
                .status("open")
                .note(body.getNote())
                .createdBy(userId)
                .build();

        StaffAdvance saved = advanceRepository.save(advance);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("advance", saved);
        return resp;
    }

    @Transactional
    public Map<String, Object> voidAdvance(Long id, Long userId) {
        StaffAdvance advance = advanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Staff advance not found: " + id));

        if (!"open".equalsIgnoreCase(advance.getStatus())) {
            throw new IllegalArgumentException("Cannot void advance with status '" + advance.getStatus() + "' (already deducted or voided)");
        }

        if (advance.getWalletId() != null) {
            Wallet wallet = walletRepository.findByIdForUpdate(advance.getWalletId()).orElse(null);
            if (wallet != null) {
                wallet.setCurrentBalance(wallet.getCurrentBalance().add(advance.getAmount()));
                walletRepository.save(wallet);
            }
        }

        if (advance.getInvoiceId() != null) {
            invoiceRepository.findById(advance.getInvoiceId()).ifPresent(inv -> {
                inv.setStatus("void");
                inv.setVoidReason("Advance voided");
                inv.setVoidedBy(userId);
                inv.setVoidedAt(OffsetDateTime.now());
                invoiceRepository.save(inv);
            });
        }

        advance.setStatus("void");
        advanceRepository.save(advance);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Advance voided and refunded successfully");
        return resp;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewPayroll(PayrollDto.PreviewPayload body) {
        LocalDate start = LocalDate.parse(body.getPeriod_start());
        LocalDate end = LocalDate.parse(body.getPeriod_end());
        long totalDaysInPeriod = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1);

        List<Map<String, Object>> staffList = getStaff(false, "owner");
        List<Map<String, Object>> items = new ArrayList<>();

        BigDecimal totalNetUsd = BigDecimal.ZERO;
        BigDecimal totalNetKhr = BigDecimal.ZERO;

        for (Map<String, Object> staff : staffList) {
            Long staffId = ((Number) staff.get("id")).longValue();
            Object baseRateObj = staff.get("base_rate");
            Object contractIdObj = staff.get("contract_id");
            if (baseRateObj == null || contractIdObj == null) {
                continue; // Skip staff without active contract
            }

            BigDecimal baseRate = new BigDecimal(baseRateObj.toString());
            Long contractId = ((Number) contractIdObj).longValue();
            String salaryType = staff.get("salary_type") != null ? staff.get("salary_type").toString() : "monthly";
            String currency = staff.get("currency") != null ? staff.get("currency").toString().toUpperCase() : "USD";
            int stdDays = staff.get("standard_days") != null ? ((Number) staff.get("standard_days")).intValue() : 26;

            // Attendance in period via repository
            Map<String, Object> attRow = payrollRepository.getStaffAttendanceStats(staffId, start, end);
            BigDecimal paidDays = BigDecimal.valueOf(((Number) attRow.get("paid_days")).doubleValue());
            int recordedDays = ((Number) attRow.get("recorded_days")).intValue();
            int unrecordedDays = (int) Math.max(0, totalDaysInPeriod - recordedDays);

            // Daily rate
            BigDecimal dailyRate = "monthly".equalsIgnoreCase(salaryType) ?
                    baseRate.divide(BigDecimal.valueOf(stdDays), 4, RoundingMode.HALF_UP) :
                    baseRate;

            // Gross: min(PaidDays, std) * daily_rate + max(0, PaidDays - std) * daily_rate
            BigDecimal normalDays = paidDays.min(BigDecimal.valueOf(stdDays));
            BigDecimal extraDays = paidDays.subtract(BigDecimal.valueOf(stdDays)).max(BigDecimal.ZERO);
            BigDecimal gross = normalDays.multiply(dailyRate).add(extraDays.multiply(dailyRate)).setScale(2, RoundingMode.HALF_UP);

            // Open advances via repository
            List<Map<String, Object>> openAdvances = payrollRepository.findOpenAdvancesForStaff(staffId, end);
            BigDecimal advancesSum = BigDecimal.ZERO;
            for (Map<String, Object> adv : openAdvances) {
                advancesSum = advancesSum.add(BigDecimal.valueOf(((Number) adv.get("amount")).doubleValue()));
            }

            // Carry-in debt from previous run via repository
            BigDecimal carryIn = payrollRepository.findLastCarryOut(staffId);

            // Net & Carry-out
            BigDecimal net = gross.subtract(advancesSum).subtract(carryIn);
            BigDecimal carryOut = BigDecimal.ZERO;
            if (net.compareTo(BigDecimal.ZERO) < 0) {
                carryOut = net.abs().setScale(2, RoundingMode.HALF_UP);
                net = BigDecimal.ZERO;
            } else {
                net = net.setScale(2, RoundingMode.HALF_UP);
            }

            if ("USD".equalsIgnoreCase(currency)) {
                totalNetUsd = totalNetUsd.add(net);
            } else {
                net = net.setScale(0, RoundingMode.HALF_UP);
                totalNetKhr = totalNetKhr.add(net);
            }

            Map<String, Object> item = new HashMap<>();
            item.put("staff_id", staffId);
            item.put("staff_name", staff.get("name"));
            item.put("position", staff.get("position"));
            item.put("contract_id", contractId);
            item.put("salary_type", salaryType);
            item.put("contract_base_rate", baseRate);
            item.put("currency", currency);
            item.put("standard_days", stdDays);
            item.put("daily_rate", dailyRate.setScale(4, RoundingMode.HALF_UP));
            item.put("days_counted", paidDays);
            item.put("days_override", null);
            item.put("override_reason", null);
            item.put("unrecorded_days", unrecordedDays);
            item.put("gross", gross);
            item.put("allowance", BigDecimal.ZERO);
            item.put("bonus", BigDecimal.ZERO);
            item.put("penalty", BigDecimal.ZERO);
            item.put("advances", advancesSum);
            item.put("advances_details", openAdvances);
            item.put("carry_in", carryIn);
            item.put("carry_out", carryOut);
            item.put("net", net);
            item.put("note", null);

            items.add(item);
        }

        Map<String, Object> preview = new HashMap<>();
        preview.put("period_start", body.getPeriod_start());
        preview.put("period_end", body.getPeriod_end());
        preview.put("payout_date", body.getPayout_date());
        preview.put("exchange_rate", body.getExchange_rate());
        preview.put("total_days_in_period", totalDaysInPeriod);
        preview.put("total_net_usd", totalNetUsd.setScale(2, RoundingMode.HALF_UP));
        preview.put("total_net_khr", totalNetKhr.setScale(0, RoundingMode.HALF_UP));
        preview.put("items", items);
        return preview;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRuns() {
        return payrollRepository.findRunsSummary();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRunById(Long id) {
        Map<String, Object> run = payrollRepository.findRunDetailsById(id);
        if (run == null) {
            throw new IllegalArgumentException("Payroll run not found: " + id);
        }
        Map<String, Object> res = new HashMap<>(run);
        List<Map<String, Object>> items = payrollRepository.findItemDetailsByRunId(id);
        res.put("items", items);
        return res;
    }

    @Transactional
    public Map<String, Object> createRun(PayrollDto.CreateRunPayload body, Long userId) {
        LocalDate start = LocalDate.parse(body.getPeriod_start());
        LocalDate end = LocalDate.parse(body.getPeriod_end());
        LocalDate payout = body.getPayout_date() != null && !body.getPayout_date().isBlank() ?
                LocalDate.parse(body.getPayout_date()) : TimeUtil.today();

        BigDecimal netUsd = BigDecimal.ZERO;
        BigDecimal netKhr = BigDecimal.ZERO;

        if (body.getItems() != null) {
            for (PayrollDto.PayrollItemPayload p : body.getItems()) {
                BigDecimal net = p.getNet() != null ? p.getNet() : BigDecimal.ZERO;
                if ("USD".equalsIgnoreCase(p.getCurrency())) {
                    netUsd = netUsd.add(net);
                } else {
                    netKhr = netKhr.add(net);
                }
            }
        }

        PayrollRun run = PayrollRun.builder()
                .title(body.getTitle())
                .periodStart(start)
                .periodEnd(end)
                .payoutDate(payout)
                .exchangeRate(body.getExchange_rate() != null ? body.getExchange_rate() : new BigDecimal("4000.00"))
                .totalNetUsd(netUsd.setScale(2, RoundingMode.HALF_UP))
                .totalNetKhr(netKhr.setScale(0, RoundingMode.HALF_UP))
                .status("draft")
                .notes(body.getNotes())
                .createdBy(userId)
                .build();

        PayrollRun savedRun = payrollRunRepository.save(run);

        if (body.getItems() != null) {
            List<PayrollItem> items = new ArrayList<>();
            for (PayrollDto.PayrollItemPayload p : body.getItems()) {
                PayrollItem item = PayrollItem.builder()
                        .payrollRun(savedRun)
                        .staffId(p.getStaff_id())
                        .contractId(p.getContract_id())
                        .currency(p.getCurrency() != null ? p.getCurrency().toUpperCase() : "USD")
                        .dailyRate(p.getDaily_rate() != null ? p.getDaily_rate() : BigDecimal.ZERO)
                        .daysCounted(p.getDays_counted() != null ? p.getDays_counted() : BigDecimal.ZERO)
                        .daysOverride(p.getDays_override())
                        .overrideReason(p.getOverride_reason())
                        .unrecordedDays(p.getUnrecorded_days() != null ? p.getUnrecorded_days() : 0)
                        .gross(p.getGross() != null ? p.getGross() : BigDecimal.ZERO)
                        .allowance(p.getAllowance() != null ? p.getAllowance() : BigDecimal.ZERO)
                        .bonus(p.getBonus() != null ? p.getBonus() : BigDecimal.ZERO)
                        .penalty(p.getPenalty() != null ? p.getPenalty() : BigDecimal.ZERO)
                        .advances(p.getAdvances() != null ? p.getAdvances() : BigDecimal.ZERO)
                        .carryIn(p.getCarry_in() != null ? p.getCarry_in() : BigDecimal.ZERO)
                        .carryOut(p.getCarry_out() != null ? p.getCarry_out() : BigDecimal.ZERO)
                        .net(p.getNet() != null ? p.getNet() : BigDecimal.ZERO)
                        .note(p.getNote())
                        .build();
                items.add(item);
            }
            payrollItemRepository.saveAll(items);
        }

        return getRunById(savedRun.getId());
    }

    @Transactional
    public Map<String, Object> payPayrollRun(Long runId, PayrollDto.PayRunPayload body, Long userId) {
        PayrollRun run = payrollRunRepository.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll run not found: " + runId));

        if (!"draft".equalsIgnoreCase(run.getStatus())) {
            throw new IllegalArgumentException("Cannot pay payroll run with status '" + run.getStatus() + "' (expected 'draft')");
        }

        List<PayrollItem> items = payrollItemRepository.findByPayrollRunId(runId);

        BigDecimal dueUsd = BigDecimal.ZERO;
        BigDecimal dueKhr = BigDecimal.ZERO;
        for (PayrollItem it : items) {
            BigDecimal net = it.getNet() != null ? it.getNet() : BigDecimal.ZERO;
            if ("USD".equalsIgnoreCase(it.getCurrency())) {
                dueUsd = dueUsd.add(net);
            } else {
                dueKhr = dueKhr.add(net);
            }
        }
        dueUsd = dueUsd.setScale(2, RoundingMode.HALF_UP);
        dueKhr = dueKhr.setScale(0, RoundingMode.HALF_UP);

        Map<String, Long> walletForCurrency = new HashMap<>();
        if (body != null && body.getPayments() != null) {
            for (PayrollDto.PayRunPaymentItem p : body.getPayments()) {
                if (p.getCurrency() != null && p.getWallet_id() != null) {
                    walletForCurrency.put(p.getCurrency().toUpperCase(), p.getWallet_id());
                }
            }
        } else if (body != null && body.getWallet_id() != null && !body.getWallet_id().isBlank()) {
            try {
                Long wId = Long.parseLong(body.getWallet_id());
                Wallet w = walletRepository.findById(wId).orElse(null);
                if (w != null) {
                    walletForCurrency.put(w.getCurrency().toUpperCase(), wId);
                }
            } catch (Exception ignored) {}
        }

        List<String> currenciesToPay = new ArrayList<>();
        if (dueUsd.compareTo(BigDecimal.ZERO) > 0) currenciesToPay.add("USD");
        if (dueKhr.compareTo(BigDecimal.ZERO) > 0) currenciesToPay.add("KHR");

        for (String c : currenciesToPay) {
            Long walletId = walletForCurrency.get(c);
            BigDecimal dueAmount = "USD".equalsIgnoreCase(c) ? dueUsd : dueKhr;
            if (walletId == null) {
                String shown = "USD".equalsIgnoreCase(c) ? "$" + dueAmount : dueAmount + " ៛";
                throw new IllegalArgumentException("សូមជ្រើសរើសកាបូបសម្រាប់បើកប្រាក់ " + c + " (" + shown + ")");
            }

            Wallet wallet = walletRepository.findByIdForUpdate(walletId)
                    .orElseThrow(() -> new IllegalArgumentException("Wallet not found: " + walletId));

            if (!c.equalsIgnoreCase(wallet.getCurrency())) {
                throw new IllegalArgumentException("Wallet " + wallet.getCode() + " currency (" + wallet.getCurrency() + ") does not match payment currency (" + c + ")");
            }
            if (wallet.getCurrentBalance().compareTo(dueAmount) < 0) {
                throw new IllegalArgumentException("កាបូប " + wallet.getNameKm() + " មិនមានប្រាក់គ្រប់គ្រាន់ — មាន " + wallet.getCurrentBalance() + " ត្រូវការ " + dueAmount);
            }

            // Deduct wallet
            wallet.setCurrentBalance(wallet.getCurrentBalance().subtract(dueAmount));
            walletRepository.save(wallet);

            // Create invoice
            boolean isUsd = "USD".equalsIgnoreCase(c);
            String invNo = "#PAY-" + run.getId() + "-" + c;
            Invoice invoice = Invoice.builder()
                    .invoiceNo(invNo)
                    .invoiceDate(TimeUtil.today())
                    .invoiceTime(TimeUtil.nowTime())
                    .type("expense")
                    .expenseKind("salary")
                    .supplierName("Staff Payroll - " + run.getTitle())
                    .categoryName("បើកប្រាក់ខែបុគ្គលិក (Staff Salary)")
                    .walletCode(wallet.getCode())
                    .totalUsd(isUsd ? dueAmount : BigDecimal.ZERO)
                    .totalKhr(isUsd ? BigDecimal.ZERO : dueAmount)
                    .paidUsd(isUsd ? dueAmount : BigDecimal.ZERO)
                    .paidKhr(isUsd ? BigDecimal.ZERO : dueAmount)
                    .status("paid")
                    .note("Salary disbursement for period " + run.getPeriodStart() + " to " + run.getPeriodEnd())
                    .createdBy(userId)
                    .build();

            Invoice savedInvoice = invoiceRepository.save(invoice);

            // Update items with invoice_id
            for (PayrollItem it : items) {
                if (c.equalsIgnoreCase(it.getCurrency())) {
                    it.setInvoiceId(savedInvoice.getId());
                    payrollItemRepository.save(it);
                }
            }
        }

        // Reconcile open advances via repository
        for (PayrollItem it : items) {
            if (it.getAdvances() != null && it.getAdvances().compareTo(BigDecimal.ZERO) > 0) {
                payrollRepository.markAdvancesDeducted(it.getId(), it.getStaffId(), run.getPeriodEnd());
            }
        }

        // Mark run as paid
        run.setStatus("paid");
        run.setPaidBy(userId);
        run.setPaidAt(OffsetDateTime.now());
        payrollRunRepository.save(run);

        return getRunById(runId);
    }

    @Transactional
    public Map<String, Object> voidRun(Long runId, String voidReason, Long userId) {
        PayrollRun run = payrollRunRepository.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Payroll run not found: " + runId));

        if ("void".equalsIgnoreCase(run.getStatus())) {
            throw new IllegalArgumentException("Payroll run is already void");
        }

        List<PayrollItem> items = payrollItemRepository.findByPayrollRunId(runId);

        if ("paid".equalsIgnoreCase(run.getStatus())) {
            // Find distinct invoice IDs
            Set<Long> invoiceIds = new HashSet<>();
            for (PayrollItem it : items) {
                if (it.getInvoiceId() != null) invoiceIds.add(it.getInvoiceId());
            }

            for (Long invId : invoiceIds) {
                invoiceRepository.findById(invId).ifPresent(inv -> {
                    if (inv.getWalletCode() != null) {
                        walletRepository.findByCode(inv.getWalletCode()).ifPresent(w -> {
                            BigDecimal refund = inv.getPaidUsd().compareTo(BigDecimal.ZERO) > 0 ? inv.getPaidUsd() : inv.getPaidKhr();
                            w.setCurrentBalance(w.getCurrentBalance().add(refund));
                            walletRepository.save(w);
                        });
                    }
                    inv.setStatus("void");
                    inv.setVoidReason(voidReason);
                    inv.setVoidedBy(userId);
                    inv.setVoidedAt(OffsetDateTime.now());
                    invoiceRepository.save(inv);
                });
            }

            // Reset deducted advances via repository
            for (PayrollItem it : items) {
                payrollRepository.resetDeductedAdvances(it.getId());
            }
        }

        run.setStatus("void");
        run.setVoidReason(voidReason);
        run.setVoidedBy(userId);
        run.setVoidedAt(OffsetDateTime.now());
        payrollRunRepository.save(run);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Payroll run voided successfully");
        return resp;
    }
}
