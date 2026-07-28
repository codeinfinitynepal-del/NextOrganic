import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { OrdersService } from './orders.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // १. यो इम्पोर्ट थप्नुहोस्

declare var $: any;
import 'select2';

@Component({
  selector: 'app-orders',
  standalone: true, // यदि स्ट्यान्डअलोन कम्पोनेन्ट हो भने
  imports: [CommonModule, FormsModule], // २. यहाँ FormsModule थप्नुहोस्
  templateUrl: './orders.component.html'
})
export class OrdersComponent implements OnInit, AfterViewInit {
  showPopup: boolean = false;
  showPopupStatus: boolean = false;
  orderList: any[] = [];
  productList: any[] = [];
  selectedItem: any;
  isLoading: boolean = false;
  selectedStatus: string = ''; // ३. छानिएको स्टेटस राख्न यसलाई प्रयोग गर्ने

  constructor(
    public service: OrdersService,
    private toastr: ToastrService,
    private el: ElementRef
  ) { }

  ngAfterViewInit(): void {}

  ngOnInit(): void {
    this.fetchAllOrders();
  }

    // ----------------------------------------------------
  // Product List को Total Amount (7700 + 990) Sum गर्ने फङ्क्सन
  // ----------------------------------------------------
  calculateGrandTotal(): number {
    if (!this.productList || this.productList.length === 0) {
      return 0;
    }

    return this.productList.reduce((sum, item) => {
      // 1. totalAmount वा total_amount छ कि छैन हेर्ने, नभए (price * qty) प्रयोग गर्ने
      const rawAmount =
        item.totalAmount ?? item.total_amount ?? item.price * item.qty;

      // 2. String/Comma आएमा हटाएर Number मा परिणत गर्ने
      const numericAmount =
        typeof rawAmount === 'string'
          ? parseFloat(rawAmount.replace(/,/g, ''))
          : Number(rawAmount);

      // 3. यदि NaN आएमा 0 लिने, नभए numericAmount जोड्ने
      return sum + (isNaN(numericAmount) ? 0 : numericAmount);
    }, 0);
  }


  fetchAllOrders() {
    this.isLoading = true;
    this.service.getAllOrders().subscribe({
      next: (res: any) => {
        this.orderList = res;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  viewOrderDetails(ID: number) {
    this.isLoading = true;
    this.service.getProductList(ID).subscribe({
      next: (res: any) => {
        this.productList = res;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openPopup(ID: number) {
    this.showPopup = true;
    this.viewOrderDetails(ID);
  }

  closePopup() {
    this.showPopup = false;
  }

  openPopupStatus(Item: any) {
    this.selectedItem = Item;
    this.selectedStatus = Item.orderStatus; // डिफ्ल्टमा पुरानै स्टेटस सेट गर्ने
    this.showPopupStatus = true;

    setTimeout(() => {
      const selectEl = $(this.el.nativeElement).find('#status');
      selectEl.select2();

      // Select2 ले भ्यालु चेन्ज गर्दा Angular लाई थाहा दिन यो आवश्यक छ
      selectEl.on('change', (e: any) => {
        this.selectedStatus = e.target.value;
      });
    }, 0);
  }

  closePopupStatus() {
    this.showPopupStatus = false;
  }

  submitStatus(ID: number) {
    // jQuery हटाएर Angular को selectedStatus भेरियबल चेक गर्ने
    if (!this.selectedStatus) {
      this.toastr.warning('Please select a status');
      return;
    }

    let payload = {
      orderId: ID,
      orderStatus: this.selectedStatus
    };

    this.isLoading = true;

    this.service.getOrdersStatus(payload).subscribe({
      next: (res: any) => {
        this.toastr.success('Status updated successfully');
        this.isLoading = false;
        this.closePopupStatus();
        this.fetchAllOrders(); // लिस्ट रिफ्रेस गर्न फेरि कल गर्ने
      },
      error: (err: any) => {
        console.error('Failed to update status:', err);
        this.toastr.error('Something went wrong!');
        this.isLoading = false;
      }
    });
  }
}