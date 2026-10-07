package com.bonchi.service;

import com.bonchi.dto.RequestDto;
import com.bonchi.entity.MoneyRequest;
import com.bonchi.entity.RequestDistribution;
import com.bonchi.entity.Transfer;
import com.bonchi.entity.Wallet;
import com.bonchi.repository.MoneyRequestRepository;
import com.bonchi.repository.RequestDistributionRepository;
import com.bonchi.repository.TransferRepository;
import com.bonchi.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RequestService {

    private final MoneyRequestRepository moneyRequestRepository;
    private final RequestDistributionRepository distributionRepository;
    private final WalletRepository walletRepository;
    private final TransferRepository transferRepository;
    private final WalletService walletService;

    @Transactional(readOnly = true)
    public List<MoneyRequest> getAll(String status) {
        String cleanStatus = status != null && !status.isBlank() ? status.trim().toLowerCase() : null;
        return moneyRequestRepository.findRequestsByStatus(cleanStatus);
    }

    @Transactional
    public Map<String, Object> create(RequestDto.CreateRequestPayload body, Long userId) {
        Long requesterId = body.getRequested_by() != null ? body.getRequested_by() : (userId != null ? userId : 1L);

        MoneyRequest request = MoneyRequest.builder()
                .requestedBy(requesterId)
                .amount(body.getAmount() != null ? body.getAmount() : BigDecimal.ZERO)
                .currency(body.getCurrency() != null ? body.getCurrency().trim().toUpperCase() : "USD")
                .categoryId(body.getCategory_id())
                .reason(body.getReason() != null ? body.getReason() : "")
                .status("pending")
                .build();

        MoneyRequest saved = moneyRequestRepository.save(request);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("money_request", saved);
        return resp;
    }

    @Transactional
    public Map<String, Object> approve(Long id, String disburseWalletId, Long approverId) {
        MoneyRequest request = moneyRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Money request not found: " + id));

        if (!"pending".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalArgumentException("Cannot approve request with status '" + request.getStatus() + "'");
        }

        String currency = request.getCurrency().toUpperCase();
        Wallet fromWallet;
        if (disburseWalletId != null && !disburseWalletId.isBlank()) {
            fromWallet = walletService.findWalletForUpdate(disburseWalletId);
        } else {
            String defaultCode = "USD".equalsIgnoreCase(currency) ? "drawer_usd" : "drawer_khr";
            fromWallet = walletRepository.findByCodeForUpdate(defaultCode)
                    .orElseGet(() -> walletRepository.findByCodePrefixAndCurrency("drawer", currency).stream()
                            .findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("Disbursement drawer wallet not found for " + currency)));
        }

        String mgrPrefix = "mgr_" + currency.toLowerCase();
        Wallet mgrWallet = walletRepository.findByCodeForUpdate(mgrPrefix)
                .or(() -> walletRepository.findByCodeForUpdate("mgr"))
                .or(() -> walletRepository.findByCodePrefixAndCurrency("mgr", currency).stream().findFirst())
                .orElseThrow(() -> new IllegalArgumentException("Manager advance wallet not found for currency " + currency));

        if (fromWallet.getCurrentBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient funds in " + fromWallet.getNameKm() +
                    " (has " + fromWallet.getCurrentBalance() + " " + currency + ", needed " + request.getAmount() + " " + currency + ")");
        }

        fromWallet.setCurrentBalance(fromWallet.getCurrentBalance().subtract(request.getAmount()));
        mgrWallet.setCurrentBalance(mgrWallet.getCurrentBalance().add(request.getAmount()));
        walletRepository.save(fromWallet);
        walletRepository.save(mgrWallet);

        Transfer transfer = Transfer.builder()
                .transferDate(LocalDate.now())
                .fromWalletId(fromWallet.getId())
                .toWalletId(mgrWallet.getId())
                .amount(request.getAmount())
                .currency(currency)
                .note("Money request #" + request.getId() + " approval")
                .requestId(request.getId())
                .createdBy(approverId)
                .build();
        transferRepository.save(transfer);

        request.setStatus("approved");
        request.setApprovedBy(approverId);
        request.setApprovedAt(OffsetDateTime.now());
        moneyRequestRepository.save(request);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("money_request", request);
        return resp;
    }

    @Transactional
    public Map<String, Object> reject(Long id, String reason, Long userId) {
        MoneyRequest request = moneyRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Money request not found: " + id));

        if (!"pending".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalArgumentException("Cannot reject request with status '" + request.getStatus() + "'");
        }

        request.setStatus("rejected");
        request.setRejectionReason(reason);
        request.setApprovedBy(userId);
        request.setApprovedAt(OffsetDateTime.now());
        moneyRequestRepository.save(request);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("money_request", request);
        return resp;
    }

    @Transactional
    public Map<String, Object> distribute(Long id, RequestDto.DistributePayload payload, Long userId) {
        MoneyRequest request = moneyRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Money request not found: " + id));

        List<RequestDistribution> list = new ArrayList<>();
        if (payload.getDistributions() != null) {
            for (RequestDto.DistributionItem item : payload.getDistributions()) {
                RequestDistribution dist = RequestDistribution.builder()
                        .moneyRequest(request)
                        .recipientName(item.getRecipient_name() != null ? item.getRecipient_name() : "")
                        .amount(item.getAmount() != null ? item.getAmount() : BigDecimal.ZERO)
                        .currency(item.getCurrency() != null ? item.getCurrency() : request.getCurrency())
                        .note(item.getNote())
                        .build();
                list.add(dist);
            }
        }
        distributionRepository.saveAll(list);

        request.setStatus("settled");
        moneyRequestRepository.save(request);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("distributions", list);
        resp.put("money_request", request);
        return resp;
    }
}
